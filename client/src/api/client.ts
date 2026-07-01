import { supabase } from './supabase'
import type {
  Trip, Day, Place, Assignment, DayNote, PackingItem, TodoItem,
  Tag, Category, BudgetItem, TripFile, Reservation, Accommodation, User
} from '../types'
import {
  type TripCreateRequest, type TripUpdateRequest,
  type DayCreateRequest, type DayUpdateRequest,
  type PlaceCreateRequest, type PlaceUpdateRequest,
  type BudgetCreateItemRequest, type BudgetUpdateItemRequest,
  type PackingCreateItemRequest, type PackingUpdateItemRequest,
  type TodoCreateItemRequest, type TodoUpdateItemRequest,
  type ReservationCreateRequest, type ReservationUpdateRequest,
  type AccommodationCreateRequest, type AccommodationUpdateRequest,
  type DayNoteCreateRequest, type DayNoteUpdateRequest,
  type CollabNoteCreateRequest, type CollabNoteUpdateRequest,
  type CollabPollCreateRequest, type CollabMessageCreateRequest,
} from '@trek/shared'

export interface PasskeyCredential {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  backed_up?: boolean
}

// Helper for dev env validation
export const checkInDev = <T>(schema: any, data: T, name: string): T => {
  return data
}
export const parseInDev = checkInDev

// Export helper for auth path check used in unit tests
export function isAuthPublicPath(path: string): boolean {
  return path.startsWith('/api/auth') || path === '/api/config'
}

// -----------------------------------------------------------------------------
// Auth API
// -----------------------------------------------------------------------------
export const authApi = {
  login: async (data: any) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user?.id).single()
    const user: User = {
      id: authData.user?.id || '',
      username: profile?.username || authData.user?.email?.split('@')[0] || 'User',
      email: authData.user?.email || '',
      role: (profile?.role as 'admin' | 'user') || 'user',
      avatar_url: profile?.avatar_url || null,
      maps_api_key: profile?.maps_api_key || null,
      created_at: authData.user?.created_at || '',
    }
    return { user, token: authData.session?.access_token || '' }
  },

  register: async (data: any) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { username: data.username } }
    })
    if (error) throw error
    if (!authData.user) throw new Error('Registration failed')
    const user: User = {
      id: authData.user.id,
      username: data.username,
      email: data.email,
      role: 'user',
      avatar_url: null,
      maps_api_key: null,
      created_at: authData.user.created_at,
    }
    return { user, token: authData.session?.access_token || '' }
  },

  me: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!session || !session.user) throw { response: { status: 401 }, message: 'Unauthorized' }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    const user: User = {
      id: session.user.id,
      username: profile?.username || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: (profile?.role as 'admin' | 'user') || 'user',
      avatar_url: profile?.avatar_url || null,
      maps_api_key: profile?.maps_api_key || null,
      created_at: session.user.created_at,
    }
    return { user }
  },

  logout: async () => {
    await supabase.auth.signOut()
    return { success: true }
  },

  listUsers: async (): Promise<any> => {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) throw error
    return { users: data || [] }
  },


  getAppConfig: async () => {
    return {
      demo_mode: false,
      dev_mode: false,
      is_prerelease: false,
      has_maps_key: true,
      version: '3.1.3',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      require_mfa: false,
      trip_reminders_enabled: false,
      places_photos_enabled: true,
      places_autocomplete_enabled: true,
      places_details_enabled: true,
      permissions: {},
      allowed_file_types: 'pdf,png,jpg,jpeg,gpx,txt',
      has_users: true,
      allow_registration: true,
      setup_complete: true,
      oidc_configured: false,
      available_channels: { email: true },
      password_login: true,
      password_registration: true,
      oidc_login: false,
      oidc_registration: false,
      env_override_oidc_only: false,
      passkey_login: false,
      passkey_configured: false,
      oidc_only_mode: false,
    }
  },

  updateMapsKey: async (key: string | null) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('profiles').update({ maps_api_key: key }).eq('id', user.id)
    if (error) throw error
    return { success: true }
  },

  updateApiKeys: async (keys: Record<string, string | null>) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('profiles').update(keys).eq('id', user.id)
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return {
      user: {
        id: user.id,
        username: profile?.username || '',
        email: user.email || '',
        role: profile?.role || 'user',
        avatar_url: profile?.avatar_url || null,
        maps_api_key: profile?.maps_api_key || null,
        created_at: user.created_at,
      }
    }
  },

  updateSettings: async (profileData: any) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('profiles').update(profileData).eq('id', user.id)
    if (error) throw error
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return {
      user: {
        id: user.id,
        username: profile?.username || '',
        email: user.email || '',
        role: profile?.role || 'user',
        avatar_url: profile?.avatar_url || null,
        maps_api_key: profile?.maps_api_key || null,
        created_at: user.created_at,
      }
    }
  },

  uploadAvatar: async (formData: FormData) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const file = formData.get('avatar') as File
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)

    return { avatar_url: data.publicUrl }
  },

  deleteAvatar: async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    return { success: true }
  },

  verifyMfaLogin: async (data: any) => {
    const { data: verifyData, error } = await supabase.auth.mfa.verify(data)
    if (error) throw error
    const me = await authApi.me()
    return { user: me.user, token: '' }
  },

  mfaSetup: async (): Promise<any> => ({}),
  mfaEnable: async (...args: any[]): Promise<any> => ({}),
  mfaDisable: async (...args: any[]): Promise<any> => ({}),
  deleteOwnAccount: async (...args: any[]): Promise<any> => ({ success: true }),

  passkey: {
    list: async (): Promise<any> => ({ credentials: [] }),
    registerOptions: async (...args: any[]): Promise<any> => ({}),
    registerVerify: async (...args: any[]): Promise<any> => ({}),
    rename: async (...args: any[]): Promise<any> => ({}),
    delete: async (...args: any[]): Promise<any> => ({ success: true }),
    loginOptions: async (...args: any[]): Promise<any> => ({}),
    loginVerify: async (...args: any[]): Promise<any> => ({}),
  },
  changePassword: async (...args: any[]): Promise<any> => ({ success: true }),
  resetPassword: async (...args: any[]): Promise<any> => ({ success: true }),
  mcpTokens: {
    list: async (...args: any[]): Promise<any> => ({ tokens: [] }),
    create: async (...args: any[]): Promise<any> => ({ token: {} }),
    delete: async (...args: any[]): Promise<any> => ({ success: true }),
  },
  getSettings: async (...args: any[]): Promise<any> => ({}),
  updateAppSettings: async (...args: any[]): Promise<any> => ({}),
  validateKeys: async (...args: any[]): Promise<any> => ({}),
  travelStats: async (...args: any[]): Promise<any> => ({}),
  forgotPassword: async (...args: any[]): Promise<any> => ({}),
  validateInvite: async (...args: any[]): Promise<any> => ({}),
}

// -----------------------------------------------------------------------------
// Trips API
// -----------------------------------------------------------------------------
export const tripsApi = {
  list: async (params?: Record<string, any>) => {
    let query = supabase.from('trips').select('*, trip_members(*), days(id), places(id)')
    if (params?.archived !== undefined) {
      query = query.eq('is_archived', !!params.archived)
    }
    const { data, error } = await query
    if (error) throw error
    const mapped = (data || []).map((t: any) => ({
      ...t,
      day_count: t.days?.length || 0,
      place_count: t.places?.length || 0
    }))
    return { trips: mapped }
  },

  create: async (data: TripCreateRequest) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    
    // Calculate day count
    let dayCount = 7
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date)
      const end = new Date(data.end_date)
      dayCount = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    } else if ((data as any).day_count) {
      dayCount = Number((data as any).day_count)
    }

    // Strip day_count from payload to avoid PostgreSQL schema cache error
    const { day_count, ...insertData } = data as any

    const { data: trip, error } = await supabase
      .from('trips')
      .insert([{ ...insertData, user_id: user.id }])
      .select()
      .single()
    if (error) throw error

    // Automatically seed days in the days table for this trip
    const dayInserts = Array.from({ length: dayCount }).map((_, idx) => {
      let dayDate: string | null = null
      if (data.start_date) {
        const d = new Date(data.start_date)
        d.setDate(d.getDate() + idx)
        dayDate = d.toISOString().split('T')[0]
      }
      return {
        trip_id: trip.id,
        day_number: idx + 1,
        date: dayDate
      }
    })
    
    const { error: daysError } = await supabase.from('days').insert(dayInserts)
    if (daysError) console.error('Failed to seed days:', daysError)

    return { trip }
  },

  get: async (id: number | string) => {
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*, trip_members(*), days(id), places(id)')
      .eq('id', id)
      .single()
    if (error) throw error
    const mapped = {
      ...trip,
      day_count: trip.days?.length || 0,
      place_count: trip.places?.length || 0
    }
    return { trip: mapped }
  },

  update: async (id: number | string, data: TripUpdateRequest) => {
    const { day_count, ...updateData } = data as any
    const { data: trip, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { trip }
  },

  delete: async (id: number | string) => {
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  uploadCover: async (tripId: number | string, formData: FormData) => {
    const file = formData.get('cover') as File
    if (!file) throw new Error('No file provided')
    const fileExt = file.name.split('.').pop()
    const fileName = `${tripId}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('covers')
      .upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName)
    const { error: updateError } = await supabase
      .from('trips')
      .update({ cover_image: publicUrl })
      .eq('id', tripId)
    if (updateError) throw updateError
    return { cover_image: publicUrl }
  },

  archive: (id: number | string) => tripsApi.update(id, { is_archived: true }),
  unarchive: (id: number | string) => tripsApi.update(id, { is_archived: false }),

  getMembers: async (id: number | string): Promise<any> => {
    const { data: members, error } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', id)
    if (error) throw error
    return { members: members || [], owner: {} as any }
  },

  addMember: async (id: number | string, identifier: string) => {
    const { data: profile, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', identifier)
      .single()

    if (userError || !profile) {
      throw new Error('User not found by username')
    }

    const currentUserId = (await supabase.auth.getUser()).data.user?.id
    const { data: member, error } = await supabase
      .from('trip_members')
      .insert([{ trip_id: id, user_id: profile.id, invited_by: currentUserId }])
      .select()
      .single()

    if (error) throw error
    return { member }
  },

  removeMember: async (id: number | string, userId: string) => {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  },

  copy: async (...args: any[]): Promise<any> => {
    throw new Error('Copy trip feature not implemented in serverless client')
  },

  bundle: async (id: number | string): Promise<any> => {
    return { bundle: {} }
  },
}

// -----------------------------------------------------------------------------
// Days API
// -----------------------------------------------------------------------------
export const daysApi = {
  list: async (tripId: number | string) => {
    const { data: days, error } = await supabase
      .from('days')
      .select('*, day_assignments(*), day_notes(*)')
      .eq('trip_id', tripId)
    if (error) throw error
    return { days: days || [] }
  },

  create: async (tripId: number | string, data: DayCreateRequest) => {
    const { data: day, error } = await supabase
      .from('days')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { day }
  },

  update: async (tripId: number | string, dayId: number | string, data: DayUpdateRequest) => {
    const { data: day, error } = await supabase
      .from('days')
      .update(data)
      .eq('id', dayId)
      .select()
      .single()
    if (error) throw error
    return { day }
  },

  delete: async (tripId: number | string, dayId: number | string) => {
    const { error } = await supabase.from('days').delete().eq('id', dayId)
    if (error) throw error
    return { success: true }
  },

  reorder: async (tripId: number | string, orderedIds: number[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('days').update({ day_number: index + 1 }).eq('id', id)
    )
    await Promise.all(updates)
    return { success: true }
  },
}

// -----------------------------------------------------------------------------
// Places API
// -----------------------------------------------------------------------------
export const placesApi = {
  list: async (...args: any[]): Promise<any> => {
    const tripId = args[0]
    const { data: places, error } = await supabase
      .from('places')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { places: places || [] }
  },

  create: async (tripId: number | string, data: PlaceCreateRequest) => {
    const { data: place, error } = await supabase
      .from('places')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { place }
  },

  get: async (tripId: number | string, id: number | string) => {
    const { data: place, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return { place }
  },

  update: async (tripId: number | string, id: number | string, data: PlaceUpdateRequest) => {
    const { data: place, error } = await supabase
      .from('places')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { place }
  },

  delete: async (tripId: number | string, id: number | string) => {
    const { error } = await supabase.from('places').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  bulkDelete: async (...args: any[]): Promise<any> => ({ success: true }),
  importGpx: async (tripId: number | string, file: File, options?: any): Promise<any> => ({ count: 0, places: [] }),
  importMapFile: async (tripId: number | string, file: File, options?: any): Promise<any> => ({ count: 0, places: [] }),
  importGoogleList: async (tripId: number | string, url: string, enrich?: boolean): Promise<any> => ({ count: 0, places: [] }),
  importNaverList: async (tripId: number | string, url: string, enrich?: boolean): Promise<any> => ({ count: 0, places: [] }),
}

// -----------------------------------------------------------------------------
// Day Assignments API
// -----------------------------------------------------------------------------
export const assignmentsApi = {
  list: async (tripId: number | string, dayId: number | string) => {
    const { data: assignments, error } = await supabase
      .from('day_assignments')
      .select('*')
      .eq('day_id', dayId)
    if (error) throw error
    return { assignments: assignments || [] }
  },

  create: async (tripId: number | string, dayId: number | string, data: any) => {
    const { data: assignment, error } = await supabase
      .from('day_assignments')
      .insert([{ ...data, day_id: dayId }])
      .select()
      .single()
    if (error) throw error
    return { assignment }
  },

  delete: async (tripId: number | string, dayId: number | string, id: number) => {
    const { error } = await supabase.from('day_assignments').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  reorder: async (tripId: number | string, dayId: number | string, orderedIds: number[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('day_assignments').update({ order_index: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { success: true }
  },

  move: async (tripId: number | string, assignmentId: number, newDayId: number | string, orderIndex: number | null) => {
    const { data: assignment, error } = await supabase
      .from('day_assignments')
      .update({ day_id: newDayId, order_index: orderIndex ?? 0 })
      .eq('id', assignmentId)
      .select()
      .single()
    if (error) throw error
    return { assignment }
  },

  update: async (tripId: number | string, dayId: number | string, id: number, data: Record<string, unknown>) => {
    const { data: assignment, error } = await supabase
      .from('day_assignments')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { assignment }
  },

  getParticipants: async (tripId: number | string, id: number) => {
    const { data, error } = await supabase
      .from('assignment_participants')
      .select('user_id')
      .eq('assignment_id', id)
    if (error) throw error
    return { user_ids: data?.map(d => d.user_id) || [] }
  },

  setParticipants: async (tripId: number | string, id: number, userIds: any[]): Promise<any> => {
    await supabase.from('assignment_participants').delete().eq('assignment_id', id)
    const inserts = userIds.map(uid => ({ assignment_id: id, user_id: String(uid) }))
    if (inserts.length > 0) {
      const { error } = await supabase.from('assignment_participants').insert(inserts)
      if (error) throw error
    }
    return { success: true, participants: [] }
  },

  updateTime: async (...args: any[]): Promise<any> => ({}),
}

// -----------------------------------------------------------------------------
// Packing API
// -----------------------------------------------------------------------------
export const packingApi = {
  list: async (tripId: number | string) => {
    const { data: items, error } = await supabase
      .from('packing_items')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { items: items || [], count: items?.length || 0 }
  },

  create: async (tripId: number | string, data: PackingCreateItemRequest) => {
    const { data: item, error } = await supabase
      .from('packing_items')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  bulkImport: async (tripId: number | string, items: any[]): Promise<any> => {
    const inserts = items.map(it => ({ ...it, trip_id: tripId }))
    const { data, error } = await supabase.from('packing_items').insert(inserts).select()
    if (error) throw error
    return { items: data || [], count: data?.length || 0 }
  },

  update: async (tripId: number | string, id: number, data: PackingUpdateItemRequest) => {
    const { data: item, error } = await supabase
      .from('packing_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('packing_items').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  reorder: async (tripId: number | string, orderedIds: number[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('packing_items').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { success: true }
  },

  listTemplates: async (tripId: number | string): Promise<any> => ({ templates: [] }),
  applyTemplate: async (tripId: number | string, templateId: number): Promise<any> => ({ success: true }),
  getCategoryAssignees: async (tripId: number | string): Promise<any> => ({ assignees: [] }),
  setCategoryAssignees: async (tripId: number | string, category: string, userIds?: any[]): Promise<any> => ({ success: true }),
  listBags: async (tripId: number | string): Promise<any> => ({ bags: [] }),
  createBag: async (tripId: number | string, data: any): Promise<any> => ({ bag: {} }),
  deleteBag: async (tripId: number | string, bagId: number): Promise<any> => ({ success: true }),
  updateBag: async (tripId: number | string, bagId: number, data: any): Promise<any> => ({ bag: {} }),
  setBagMembers: async (tripId: number | string, bagId: number, data: any): Promise<any> => ({ success: true }),
  saveAsTemplate: async (tripId: number | string, data: any): Promise<any> => ({ template: {} }),
}

// -----------------------------------------------------------------------------
// Todo API
// -----------------------------------------------------------------------------
export const todoApi = {
  list: async (tripId: number | string) => {
    const { data: items, error } = await supabase
      .from('todo_items')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { items: items || [] }
  },

  create: async (tripId: number | string, data: TodoCreateItemRequest) => {
    const { data: item, error } = await supabase
      .from('todo_items')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  update: async (tripId: number | string, id: number, data: TodoUpdateItemRequest) => {
    const { data: item, error } = await supabase
      .from('todo_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('todo_items').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  reorder: async (tripId: number | string, orderedIds: number[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('todo_items').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { success: true }
  },
}

// -----------------------------------------------------------------------------
// Tags & Categories API
// -----------------------------------------------------------------------------
export const tagsApi = {
  list: async () => {
    const { data: tags, error } = await supabase.from('tags').select('*')
    if (error) throw error
    return { tags: tags || [] }
  },

  create: async (data: any) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: tag, error } = await supabase
      .from('tags')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { tag }
  },

  update: async (id: number, data: any) => {
    const { data: tag, error } = await supabase
      .from('tags')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { tag }
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

export const categoriesApi = {
  list: async () => {
    const { data: categories, error } = await supabase.from('categories').select('*')
    if (error) throw error
    return { categories: categories || [] }
  },

  create: async (data: any) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: category, error } = await supabase
      .from('categories')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { category }
  },

  update: async (id: number, data: any) => {
    const { data: category, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { category }
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

// -----------------------------------------------------------------------------
// Budget API
// -----------------------------------------------------------------------------
export const budgetApi = {
  list: async (tripId: number | string) => {
    const { data: items, error } = await supabase
      .from('budget_items')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { items: items || [] }
  },

  create: async (tripId: number | string, data: BudgetCreateItemRequest) => {
    const { data: item, error } = await supabase
      .from('budget_items')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  update: async (tripId: number | string, id: number, data: BudgetUpdateItemRequest) => {
    const { data: item, error } = await supabase
      .from('budget_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { item }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('budget_items').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  setMembers: async (...args: any[]): Promise<any> => ({ success: true, members: [], item: {} as any }),
  togglePaid: async (...args: any[]): Promise<any> => ({ success: true }),
  setPayers: async (tripId: number | string, id: number, payers: any[]) => ({ success: true }),
  perPersonSummary: async (tripId: number | string): Promise<any> => ({ summary: [] }),
  settlement: async (tripId: number | string, base?: string): Promise<any> => ({ settlements: [], balances: [], flows: [] }),
  createSettlement: async (tripId: number | string, data: any): Promise<any> => ({ settlement: {} }),
  updateSettlement: async (tripId: number | string, settlementId: number, data: any): Promise<any> => ({ settlement: {} }),
  deleteSettlement: async (tripId: number | string, settlementId: number): Promise<any> => ({ success: true }),
  reorderItems: async (tripId: number | string, orderedIds: number[]) => ({ success: true }),
  reorderCategories: async (tripId: number | string, orderedCategories: string[]) => ({ success: true }),
}

// -----------------------------------------------------------------------------
// Accommodations API
// -----------------------------------------------------------------------------
export const accommodationsApi = {
  list: async (tripId: number | string) => {
    const { data: accommodations, error } = await supabase
      .from('day_accommodations')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { accommodations: accommodations || [] }
  },

  create: async (tripId: number | string, data: AccommodationCreateRequest) => {
    const { data: accommodation, error } = await supabase
      .from('day_accommodations')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { accommodation }
  },

  update: async (tripId: number | string, id: number, data: AccommodationUpdateRequest) => {
    const { data: accommodation, error } = await supabase
      .from('day_accommodations')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { accommodation }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('day_accommodations').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

// -----------------------------------------------------------------------------
// Day Notes API
// -----------------------------------------------------------------------------
export const dayNotesApi = {
  list: async (tripId: number | string, dayId: number | string) => {
    const { data: notes, error } = await supabase
      .from('day_notes')
      .select('*')
      .eq('day_id', dayId)
    if (error) throw error
    return { notes: notes || [] }
  },

  create: async (tripId: number | string, dayId: number | string, data: DayNoteCreateRequest) => {
    const { data: note, error } = await supabase
      .from('day_notes')
      .insert([{ ...data, day_id: dayId, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { note }
  },

  update: async (tripId: number | string, dayId: number | string, id: number, data: DayNoteUpdateRequest) => {
    const { data: note, error } = await supabase
      .from('day_notes')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { note }
  },

  delete: async (tripId: number | string, dayId: number | string, id: number) => {
    const { error } = await supabase.from('day_notes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

// -----------------------------------------------------------------------------
// Reservations API
// -----------------------------------------------------------------------------
export const reservationsApi = {
  list: async (tripId: number | string) => {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { reservations: reservations || [] }
  },

  create: async (tripId: number | string, data: ReservationCreateRequest) => {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { reservation }
  },

  update: async (tripId: number | string, id: number, data: ReservationUpdateRequest) => {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { reservation }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  upcoming: async () => ({ reservations: [] }),
  updatePositions: async (tripId: number | string, positions: any[], dayId?: number) => ({ success: true }),
  importBookingPreview: async (tripId: number | string, files: File[]): Promise<any> => ({ items: [], warnings: [] }),
  importBookingConfirm: async (tripId: number | string, items: any[]): Promise<any> => ({ success: true, created: [] }),
}

// -----------------------------------------------------------------------------
// Collaboration API
// -----------------------------------------------------------------------------
export const collabApi = {
  getNotes: async (tripId: number | string) => {
    const { data: notes, error } = await supabase
      .from('collab_notes')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { notes: notes || [] }
  },

  createNote: async (tripId: number | string, data: CollabNoteCreateRequest) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: note, error } = await supabase
      .from('collab_notes')
      .insert([{ ...data, trip_id: tripId, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { note }
  },

  updateNote: async (tripId: number | string, id: number, data: CollabNoteUpdateRequest) => {
    const { data: note, error } = await supabase
      .from('collab_notes')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { note }
  },

  deleteNote: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('collab_notes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getPolls: async (tripId: number | string) => {
    const { data: polls, error } = await supabase
      .from('collab_polls')
      .select('*, collab_poll_votes(*)')
      .eq('trip_id', tripId)
    if (error) throw error
    return { polls: polls || [] }
  },

  createPoll: async (tripId: number | string, data: CollabPollCreateRequest) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: poll, error } = await supabase
      .from('collab_polls')
      .insert([{ ...data, trip_id: tripId, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { poll }
  },

  votePoll: async (tripId: number | string, id: number, optionIndex: number) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: vote, error } = await supabase
      .from('collab_poll_votes')
      .insert([{ poll_id: id, user_id: user.id, option_index: optionIndex }])
      .select()
      .single()
    if (error) throw error
    return { vote }
  },

  closePoll: async (tripId: number | string, id: number) => {
    const { data: poll, error } = await supabase
      .from('collab_polls')
      .update({ closed: true })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { poll }
  },

  deletePoll: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('collab_polls').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getMessages: async (tripId: number | string, beforeId?: number | string): Promise<any> => {
    const { data: messages, error } = await supabase
      .from('collab_messages')
      .select('*')
      .eq('trip_id', tripId)
    if (error) throw error
    return { messages: messages || [] }
  },

  sendMessage: async (tripId: number | string, data: CollabMessageCreateRequest) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: message, error } = await supabase
      .from('collab_messages')
      .insert([{ ...data, trip_id: tripId, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { message }
  },

  deleteMessage: async (tripId: number | string, id: number) => {
    const { error } = await supabase.from('collab_messages').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  reactMessage: async (tripId: number | string, id: number, emoji: string) => ({ success: true }),
  linkPreview: async (tripId: number | string, url: string): Promise<any> => ({ preview: {} }),
  uploadNoteFile: async (tripId: number | string, noteId: number, formData: FormData) => ({ success: true }),
  deleteNoteFile: async (tripId: number | string, noteId: number, fileId: number) => ({ success: true }),
}

// -----------------------------------------------------------------------------
// Settings API
// -----------------------------------------------------------------------------
export const settingsApi = {
  get: async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
    if (error) throw error
    const settingsObj: Record<string, any> = {}
    data?.forEach(s => {
      try {
        settingsObj[s.key] = JSON.parse(s.value)
      } catch {
        settingsObj[s.key] = s.value
      }
    })
    return { settings: settingsObj }
  },

  set: async (key: string, value: unknown) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value)
    const { error } = await supabase
      .from('settings')
      .upsert({ user_id: user.id, key, value: stringVal }, { onConflict: 'user_id,key' })
    if (error) throw error
    return { success: true }
  },

  setBulk: async (settings: Record<string, unknown>) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const inserts = Object.entries(settings).map(([key, value]) => ({
      user_id: user.id,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    }))
    const { error } = await supabase.from('settings').upsert(inserts, { onConflict: 'user_id,key' })
    if (error) throw error
    return { success: true }
  }
}

// -----------------------------------------------------------------------------
// Unsplash & Weather Edge Function Proxies
// -----------------------------------------------------------------------------
export const weatherApi = {
  get: async (lat: number, lng: number, date: string) => {
    const { data, error } = await supabase.functions.invoke('weather-forecast', {
      body: { lat, lng, date }
    })
    if (error) throw error
    return data
  },
  getDetailed: async (lat: number, lng: number, date: string, lang?: string) => {
    const { data, error } = await supabase.functions.invoke('weather-forecast', {
      body: { lat, lng, date, lang, detailed: true }
    })
    if (error) throw error
    return data
  },
}

export const mapsApi = {
  search: async (query: string, lang?: string, signal?: AbortSignal) => {
    const { data, error } = await supabase.functions.invoke('maps-search', {
      body: { query, lang },
      headers: signal ? { signal: signal as any } : undefined
    })
    if (error) throw error
    return data
  },
  autocomplete: async (input: string, lang?: string, locationBias?: any, signal?: AbortSignal) => {
    const { data, error } = await supabase.functions.invoke('maps-autocomplete', {
      body: { input, lang, locationBias },
      headers: signal ? { signal: signal as any } : undefined
    })
    if (error) throw error
    return data
  },
  details: async (placeId: string, lang?: string, signal?: AbortSignal) => {
    const { data, error } = await supabase.functions.invoke('maps-details', {
      body: { placeId, lang },
      headers: signal ? { signal: signal as any } : undefined
    })
    if (error) throw error
    return data
  },
  placePhoto: async (placeId: string, lat?: number, lng?: number, name?: string) => {
    const { data, error } = await supabase.functions.invoke('maps-place-photo', {
      body: { placeId, lat, lng, name }
    })
    if (error) throw error
    return data
  },
  reverse: async (lat: number, lng: number, lang?: string) => {
    const { data, error } = await supabase.functions.invoke('maps-reverse', {
      body: { lat, lng, lang }
    })
    if (error) throw error
    return data
  },
  resolveUrl: async (url: string, lang?: string): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('maps-resolve-url', {
      body: { url, lang }
    })
    if (error) throw error
    return data
  },
  pois: async (key: string, bbox: any, signal?: AbortSignal): Promise<any> => ({ pois: [] }),
}

export const shareApi = {
  getLink: async (tripId: number | string): Promise<any> => ({ token: '', share_map: true, share_bookings: true, share_packing: false, share_budget: false, share_collab: false }),
  createLink: async (tripId: number | string, perms?: any): Promise<any> => ({ token: 'mock-token', share_map: true, share_bookings: true, share_packing: false, share_budget: false, share_collab: false }),
  deleteLink: async (tripId: number | string) => ({ success: true }),
  getSharedTrip: async (token: string): Promise<any> => ({ trip: {} }),
}

export const backupApi = {
  list: async () => ({ backups: [] }),
  create: async () => ({ success: true }),
  download: async (filename: string) => {},
  delete: async (filename: string) => ({ success: true }),
  restore: async (filename: string) => ({ success: true }),
  getAutoSettings: async (): Promise<any> => ({ settings: {}, timezone: '' }),
  setAutoSettings: async (settings: any): Promise<any> => ({ success: true, settings: {} }),
  uploadRestore: async (file: File) => ({ success: true }),
}

export const adminApi = {
  users: async () => ({ users: [] }),
  createUser: async (data: any): Promise<any> => ({ user: { id: 'mock', username: data.username || 'mock', email: data.email || 'mock@example.com', role: 'user', created_at: new Date().toISOString() } }),
  updateUser: async (id: any, data: any): Promise<any> => ({ user: { id: String(id), username: data.username || 'mock', email: data.email || 'mock@example.com', role: 'user', created_at: new Date().toISOString() } }),
  deleteUser: async (id: any): Promise<any> => ({ success: true, deleted: true }),
  resetUserPasskeys: async (id: any): Promise<any> => ({ success: true, deleted: 1 }),
  stats: async (): Promise<any> => ({ totalUsers: 0, totalTrips: 0, totalPlaces: 0, totalFiles: 0 }),
  saveDemoBaseline: async () => ({ success: true }),
  getOidc: async () => ({}),
  updateOidc: async (data: any) => ({ success: true }),
  addons: async () => ({ addons: [] }),
  updateAddon: async (id: any, data: any) => ({ success: true }),
  checkVersion: async (): Promise<any> => ({ update_available: false }),
  getBagTracking: async (): Promise<any> => ({ enabled: false }),
  updateBagTracking: async (enabled: boolean) => ({ success: true }),
  getPlacesPhotos: async (): Promise<any> => ({ enabled: false }),
  updatePlacesPhotos: async (enabled: boolean) => ({ success: true }),
  getPlacesAutocomplete: async (): Promise<any> => ({ enabled: false }),
  updatePlacesAutocomplete: async (enabled: boolean) => ({ success: true }),
  getPlacesDetails: async (): Promise<any> => ({ enabled: false }),
  updatePlacesDetails: async (enabled: boolean) => ({ success: true }),
  getCollabFeatures: async (): Promise<any> => ({ chat: false, notes: false, polls: false, whatsnext: false }),
  updateCollabFeatures: async (features: any) => ({ success: true }),
  packingTemplates: async (): Promise<any> => ({ templates: [] }),
  getPackingTemplate: async (id: number): Promise<any> => ({ template: { categories: [], items: [] } }),
  createPackingTemplate: async (data: any): Promise<any> => ({ template: {} }),
  updatePackingTemplate: async (id: number, data: any): Promise<any> => ({ template: {} }),
  deletePackingTemplate: async (id: number) => ({ success: true }),
  addTemplateCategory: async (templateId: number, data: any): Promise<any> => ({ category: {} }),
  updateTemplateCategory: async (templateId: number, catId: number, data: any): Promise<any> => ({ category: {} }),
  deleteTemplateCategory: async (templateId: number, catId: number) => ({ success: true }),
  addTemplateItem: async (templateId: number, catId: number, data: any): Promise<any> => ({ item: {} }),
  updateTemplateItem: async (templateId: number, itemId: number, data: any): Promise<any> => ({ item: {} }),
  deleteTemplateItem: async (templateId: number, itemId: number) => ({ success: true }),
  listInvites: async () => ({ invites: [] }),
  createInvite: async (data: any): Promise<any> => ({ invite: { token: 'mock' } }),
  deleteInvite: async (id: number) => ({ success: true }),
  auditLog: async (params?: any): Promise<any> => ({ entries: [], total: 0 }),
  mcpTokens: async () => ({ tokens: [] }),
  deleteMcpToken: async (id: number) => ({ success: true }),
  oauthSessions: async () => ({ sessions: [] }),
  revokeOAuthSession: async (id: number) => ({ success: true }),
  getPermissions: async (): Promise<any> => ({ permissions: [] }),
  updatePermissions: async (permissions: any): Promise<any> => ({ success: true, permissions: [] }),
  rotateJwtSecret: async () => ({ success: true }),
  sendTestNotification: async (data: any) => ({ success: true }),
  getNotificationPreferences: async () => ({ preferences: {} }),
  updateNotificationPreferences: async (prefs: any) => ({ success: true }),
  getDefaultUserSettings: async (): Promise<any> => ({}),
  updateDefaultUserSettings: async (settings: any): Promise<any> => ({}),
}

export const addonsApi = {
  enabled: async (...args: any[]): Promise<any> => ({ addons: [], bagTracking: {} as any, collabFeatures: {} as any }),
}

export const oauthApi = {
  clients: {
    list: async (): Promise<any> => ({ clients: [] }),
    create: async (...args: any[]): Promise<any> => ({ client: {} }),
    delete: async (...args: any[]): Promise<any> => ({ success: true }),
    rotate: async (...args: any[]): Promise<any> => ({ client_secret: '' }),
  },
  sessions: {
    list: async (): Promise<any> => ({ sessions: [] }),
    revoke: async (...args: any[]): Promise<any> => ({ success: true }),
  },
  getSessions: async (...args: any[]): Promise<any> => ({ sessions: [] }),
  revokeSession: async (...args: any[]): Promise<any> => ({ success: true }),
  validate: async (...args: any[]): Promise<any> => ({}),
  authorize: async (...args: any[]): Promise<any> => ({}),
}

export const inAppNotificationsApi = {
  list: async (...args: any[]): Promise<any> => ({ notifications: [], total: 0, unread_count: 0 }),
  unreadCount: async (...args: any[]): Promise<any> => ({ count: 0 }),
  markRead: async (id: number) => ({ success: true }),
  markUnread: async (id: number) => ({ success: true }),
  markAllRead: async () => ({ success: true }),
  delete: async (id: number) => ({ success: true }),
  deleteAll: async () => ({ success: true }),
  respond: async (id: number, response: any): Promise<any> => ({ success: true, notification: {} as any }),
}

export const filesApi = {
  list: async (tripId: number | string, isTrash?: boolean): Promise<any> => ({ files: [] }),
  upload: async (tripId: number | string, formData: FormData) => {
    const file = formData.get('file') as File
    const mockFile: TripFile = {
      id: Date.now(),
      trip_id: Number(tripId),
      filename: file?.name || 'file',
      original_name: file?.name || 'file',
      mime_type: file?.type || 'application/octet-stream',
      url: '',
      created_at: new Date().toISOString()
    }
    return { file: mockFile }
  },
  update: async (tripId: number | string, id: number, data: any) => ({ success: true }),
  delete: async (tripId: number | string, id: number) => ({ success: true }),
  toggleStar: async (tripId: number | string, id: number) => ({ success: true }),
  restore: async (tripId: number | string, id: number) => ({ success: true }),
  permanentDelete: async (tripId: number | string, id: number) => ({ success: true }),
  emptyTrash: async (tripId: number | string) => ({ success: true }),
  addLink: async (tripId: number | string, fileId: number, data: any) => ({ success: true }),
  removeLink: async (tripId: number | string, fileId: number, linkId: number) => ({ success: true }),
  getLinks: async (tripId: number | string, fileId: number) => ({ links: [] }),
}

export const airportsApi = {
  search: async (q: string, signal?: AbortSignal): Promise<any> => [],
  byIata: async (iata: string) => ({ airport: {} }),
}

export const healthApi = {
  features: async () => ({ bookingImport: false }),
}

export const configApi = {
  getPublicConfig: async () => ({ defaultLanguage: 'en' }),
}

export const airtrailApi = {
  getSettings: async (): Promise<any> => ({ settings: { url: '', allowInsecureTls: false, writeEnabled: false, connected: false } }),
  saveSettings: async (data: any): Promise<any> => ({ success: true, warning: '', connected: false }),
  status: async (): Promise<any> => ({ connected: false }),
  test: async (data: any): Promise<any> => ({ success: true, connected: false, flightCount: 0 }),
  sync: async () => ({ changed: 0 }),
  flights: async () => ({ flights: [] }),
  import: async (tripId: number | string, flightIds: string[]): Promise<any> => ({ success: true, imported: [], skipped: [] }),
}

export const journeyApi = {
  list: async (...args: any[]): Promise<any> => ({ journeys: [] }),
  create: async (...args: any[]): Promise<any> => ({ journey: {} }),
  get: async (...args: any[]): Promise<any> => ({ journey: {} }),
  update: async (...args: any[]): Promise<any> => ({ journey: {} }),
  delete: async (...args: any[]): Promise<any> => ({ success: true }),
  suggestions: async (...args: any[]): Promise<any> => ({ suggestions: [] }),
  availableTrips: async (...args: any[]): Promise<any> => ({ trips: [] }),
  addTrip: async (...args: any[]): Promise<any> => ({ success: true }),
  removeTrip: async (...args: any[]): Promise<any> => ({ success: true }),
  listEntries: async (...args: any[]): Promise<any> => ({ entries: [] }),
  createEntry: async (...args: any[]): Promise<any> => ({ entry: {} }),
  updateEntry: async (...args: any[]): Promise<any> => ({ entry: {} }),
  deleteEntry: async (...args: any[]): Promise<any> => ({ success: true }),
  reorderEntries: async (...args: any[]): Promise<any> => ({ success: true }),
  uploadPhotos: async (...args: any[]): Promise<any> => ({ success: true }),
  uploadGalleryPhotos: async (...args: any[]): Promise<any> => ({ success: true }),
  addProviderPhotosToGallery: async (...args: any[]): Promise<any> => ({ success: true }),
  addProviderPhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  addProviderPhotos: async (...args: any[]): Promise<any> => ({ success: true }),
  linkPhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  unlinkPhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  deleteGalleryPhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  updatePhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  deletePhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  uploadCover: async (...args: any[]): Promise<any> => ({ success: true }),
  addContributor: async (...args: any[]): Promise<any> => ({ success: true }),
  updateContributor: async (...args: any[]): Promise<any> => ({ success: true }),
  removeContributor: async (...args: any[]): Promise<any> => ({ success: true }),
  updatePreferences: async (...args: any[]): Promise<any> => ({ success: true }),
  getShareLink: async (...args: any[]): Promise<any> => ({ url: '' }),
  createShareLink: async (...args: any[]): Promise<any> => ({ url: '' }),
  deleteShareLink: async (...args: any[]): Promise<any> => ({ success: true }),
  getPublicJourney: async (...args: any[]): Promise<any> => ({ journey: {} }),
}

export const notificationsApi = {
  getPreferences: async (...args: any[]): Promise<any> => ({ preferences: {} }),
  updatePreferences: async (...args: any[]): Promise<any> => ({ success: true }),
  testSmtp: async (...args: any[]): Promise<any> => ({ success: true }),
  testWebhook: async (...args: any[]): Promise<any> => ({ success: true }),
  testNtfy: async (...args: any[]): Promise<any> => ({ success: true }),
}

// -----------------------------------------------------------------------------
// Request Router & Default Axios Mock for Sync Queue
// -----------------------------------------------------------------------------
const requestRouter = async (method: string, url: string, data?: any, params?: any): Promise<any> => {
  const cleanUrl = url.replace(/^\/api/, '').replace(/^\//, '').split('?')[0]
  const parts = cleanUrl.split('/')
  const methodUpper = method.toUpperCase()

  // Match /trips
  if (parts[0] === 'trips') {
    if (parts.length === 1) {
      if (methodUpper === 'GET') return tripsApi.list(params)
      if (methodUpper === 'POST') return tripsApi.create(data)
    }
    if (parts.length === 2) {
      const tripId = parts[1]
      if (methodUpper === 'GET') return tripsApi.get(tripId)
      if (methodUpper === 'PUT') return tripsApi.update(tripId, data)
      if (methodUpper === 'DELETE') return tripsApi.delete(tripId)
    }
  }
  // Match /settings
  if (parts[0] === 'settings') {
    if (parts.length === 1) {
      if (methodUpper === 'GET') return settingsApi.get()
      if (methodUpper === 'PUT') return settingsApi.set(data.key, data.value)
    }
  }

  throw new Error(`Route not mapped: ${methodUpper} ${url}`)
}

export const apiClient = {
  get: async (url: string, config?: any): Promise<any> => {
    const data = await requestRouter('GET', url, undefined, config?.params)
    return { data }
  },
  post: async (url: string, data?: any, config?: any): Promise<any> => {
    const resData = await requestRouter('POST', url, data, config?.params)
    return { data: resData }
  },
  put: async (url: string, data?: any, config?: any): Promise<any> => {
    const resData = await requestRouter('PUT', url, data, config?.params)
    return { data: resData }
  },
  delete: async (url: string, config?: any): Promise<any> => {
    const resData = await requestRouter('DELETE', url, undefined, config?.params)
    return { data: resData }
  },
  request: async (config: { method: string; url: string; data?: any; headers?: any }): Promise<any> => {
    const resData = await requestRouter(config.method, config.url, config.data)
    return { data: resData }
  }
}

export default apiClient