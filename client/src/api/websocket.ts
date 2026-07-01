// Singleton manager for real-time collaboration using Supabase Realtime
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type WebSocketListener = (event: Record<string, any>) => void
type RefetchCallback = (tripId: string) => void

const channels = new Map<string, RealtimeChannel>()
const listeners = new Set<WebSocketListener>()
const activeTrips = new Set<string>()
let refetchCallback: RefetchCallback | null = null
let preReconnectHook: (() => Promise<void>) | null = null

export function getSocketId(): string | null {
  return 'supabase'
}

export function getActiveTrips(): string[] {
  return Array.from(activeTrips)
}

export function setRefetchCallback(fn: RefetchCallback | null): void {
  refetchCallback = fn
}

export function setPreReconnectHook(fn: (() => Promise<void>) | null): void {
  preReconnectHook = fn
}

export function connect(): void {
  // Supabase client manages the connection automatically
}

export function disconnect(): void {
  activeTrips.clear()
  channels.forEach(channel => {
    channel.unsubscribe()
  })
  channels.clear()
  console.log('[realtime] Disconnected all channels')
}

export function joinTrip(tripId: number | string): void {
  const tripStr = String(tripId)
  activeTrips.add(tripStr)

  if (channels.has(tripStr)) return

  const broadcastEvent = (type: string, payload: any) => {
    listeners.forEach(fn => {
      try {
        fn({ type, ...payload })
      } catch (err) {
        console.error('Realtime listener error:', err)
      }
    })
  }

  // Set up Supabase Realtime Channel
  const channel = supabase.channel(`trip:${tripStr}`)

  // Helper to map DB changes to WebSocket events
  const handleDbChange = (table: string, payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload
    const data = newRow || oldRow

    if (eventType === 'INSERT') {
      if (table === 'places') broadcastEvent('place:created', { place: data })
      else if (table === 'days') broadcastEvent('day:created', { day: data })
      else if (table === 'day_assignments') broadcastEvent('assignment:created', { assignment: data })
      else if (table === 'day_notes') broadcastEvent('dayNote:created', { note: data, dayId: data.day_id })
      else if (table === 'packing_items') broadcastEvent('packing:created', { item: data })
      else if (table === 'todo_items') broadcastEvent('todo:created', { item: data })
      else if (table === 'budget_items') broadcastEvent('budget:created', { item: data })
      else if (table === 'collab_notes') broadcastEvent('collab:note:created', { note: data })
      else if (table === 'collab_polls') broadcastEvent('collab:poll:created', { poll: data })
      else if (table === 'collab_messages') broadcastEvent('collab:chat:message', { message: data })
      else if (table === 'trip_files') broadcastEvent('collab:file:uploaded', { file: data })
    } else if (eventType === 'UPDATE') {
      if (table === 'places') broadcastEvent('place:updated', { place: data })
      else if (table === 'days') broadcastEvent('day:updated', { day: data })
      else if (table === 'day_assignments') broadcastEvent('assignment:updated', { assignment: data })
      else if (table === 'day_notes') broadcastEvent('dayNote:updated', { note: data, dayId: data.day_id })
      else if (table === 'packing_items') broadcastEvent('packing:updated', { item: data })
      else if (table === 'todo_items') broadcastEvent('todo:updated', { item: data })
      else if (table === 'budget_items') broadcastEvent('budget:updated', { item: data })
      else if (table === 'collab_notes') broadcastEvent('collab:note:updated', { note: data })
      else if (table === 'collab_polls') broadcastEvent('collab:poll:updated', { poll: data })
      else if (table === 'collab_messages') broadcastEvent('collab:chat:updated', { message: data })
      else if (table === 'trip_files') broadcastEvent('collab:file:updated', { file: data })
    } else if (eventType === 'DELETE') {
      const oldId = data.id
      if (table === 'places') broadcastEvent('place:deleted', { placeId: oldId })
      else if (table === 'days') broadcastEvent('day:deleted', { dayId: oldId })
      else if (table === 'day_assignments') broadcastEvent('assignment:deleted', { id: oldId, dayId: data.day_id })
      else if (table === 'day_notes') broadcastEvent('dayNote:deleted', { noteId: oldId, dayId: data.day_id })
      else if (table === 'packing_items') broadcastEvent('packing:deleted', { itemId: oldId })
      else if (table === 'todo_items') broadcastEvent('todo:deleted', { itemId: oldId })
      else if (table === 'budget_items') broadcastEvent('budget:deleted', { itemId: oldId })
      else if (table === 'collab_notes') broadcastEvent('collab:note:deleted', { noteId: oldId })
      else if (table === 'collab_polls') broadcastEvent('collab:poll:deleted', { pollId: oldId })
      else if (table === 'collab_messages') broadcastEvent('collab:chat:deleted', { messageId: oldId })
      else if (table === 'trip_files') broadcastEvent('collab:file:deleted', { fileId: oldId })
    }
  }

  // Subscribe to changes on each table filtered by trip_id
  // day_notes has trip_id column so it gets the trip-scoped filter
  const tablesWithTripId = [
    'places', 'days', 'packing_items', 'todo_items',
    'budget_items', 'collab_notes', 'collab_polls', 'collab_messages', 'trip_files',
    'day_notes', 'reservations', 'day_accommodations'
  ]
  // day_assignments links via day_id (no direct trip_id), RLS restricts by membership
  const tablesViaFk = ['day_assignments']

  tablesWithTripId.forEach(table => {
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter: `trip_id=eq.${tripStr}`
    }, (payload) => handleDbChange(table, payload))
  })

  tablesViaFk.forEach(table => {
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table
    }, (payload) => handleDbChange(table, payload))
  })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[realtime] Subscribed to trip:${tripStr}`)
    }
  })

  channels.set(tripStr, channel)
}

export function leaveTrip(tripId: number | string): void {
  const tripStr = String(tripId)
  activeTrips.delete(tripStr)
  const channel = channels.get(tripStr)
  if (channel) {
    channel.unsubscribe()
    channels.delete(tripStr)
    console.log(`[realtime] Unsubscribed from trip:${tripStr}`)
  }
}

export function addListener(fn: WebSocketListener): void {
  listeners.add(fn)
}

export function removeListener(fn: WebSocketListener): void {
  listeners.delete(fn)
}
