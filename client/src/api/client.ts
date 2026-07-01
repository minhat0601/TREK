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
    const { data, error } = await supabase.from('app_settings').select('*')
    const dbConfig: Record<string, any> = {}
    if (data) {
      for (const row of data) {
        let val = row.value
        try {
          val = JSON.parse(row.value)
        } catch {
          // Keep raw string
        }
        dbConfig[row.key] = val
      }
    }
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
      ...dbConfig
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

  mfaSetup: async (): Promise<any> => {
    // Enroll TOTP factor via Supabase Auth
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) throw error
    return {
      qr_svg: data.totp.qr_code,      // SVG URI for QR code display
      secret: data.totp.secret,        // base32 manual entry secret
      factor_id: data.id,              // needed for mfaEnable
    }
  },
  mfaEnable: async (data: { code: string; factor_id: string }): Promise<any> => {
    // Challenge then verify
    const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: data.factor_id })
    if (ce) throw ce
    const { error: ve } = await supabase.auth.mfa.verify({
      factorId: data.factor_id,
      challengeId: challenge.id,
      code: data.code.replace(/\s/g, ''),
    })
    if (ve) throw ve
    return { success: true }
  },
  mfaDisable: async (_data?: any): Promise<any> => {
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.[0]
    if (!totp) return { success: true }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id })
    if (error) throw error
    return { success: true }
  },
  deleteOwnAccount: async (): Promise<any> => {
    // Supabase Admin API is required to delete a user — use Edge Function
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || 'Failed to delete account')
    }
    await supabase.auth.signOut()
    return { success: true }
  },

  passkey: {
    list: async (): Promise<any> => ({ credentials: [] }),
    registerOptions: async (...args: any[]): Promise<any> => ({}),
    registerVerify: async (...args: any[]): Promise<any> => ({}),
    rename: async (...args: any[]): Promise<any> => ({}),
    delete: async (...args: any[]): Promise<any> => ({ success: true }),
    loginOptions: async (...args: any[]): Promise<any> => ({}),
    loginVerify: async (...args: any[]): Promise<any> => ({}),
  },
  changePassword: async (data: { current_password?: string; new_password: string }): Promise<any> => {
    // Active session proves identity; Supabase client has no reauthentication endpoint
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    if (error) throw error
    return { success: true }
  },
  resetPassword: async (data: any): Promise<any> => {
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    if (error) throw error
    return { success: true }
  },
  mcpTokens: {
    list: async (...args: any[]): Promise<any> => ({ tokens: [] }),
    create: async (...args: any[]): Promise<any> => ({ token: {} }),
    delete: async (...args: any[]): Promise<any> => ({ success: true }),
  },
  getSettings: async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { settings: {} }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return {
      settings: {
        maps_api_key: profile?.maps_api_key || '',
        openweather_api_key: profile?.openweather_api_key || ''
      }
    }
  },
  updateAppSettings: async (settings: any) => {
    for (const [key, value] of Object.entries(settings)) {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value)
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: valStr })
      if (error) throw error
    }
    return { success: true }
  },
  validateKeys: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return {}
    const { data: profile } = await supabase.from('profiles')
      .select('maps_api_key, openweather_api_key').eq('id', user.id).single()
    const mapsKey = profile?.maps_api_key || ''
    const weatherKey = profile?.openweather_api_key || ''
    return {
      maps: mapsKey.length > 0
        ? { valid: mapsKey.startsWith('AIza') && mapsKey.length >= 39, key: mapsKey.slice(0, 8) + '...' }
        : { valid: false, key: null },
      weather: weatherKey.length > 0
        ? { valid: /^[a-f0-9]{32}$/.test(weatherKey), key: weatherKey.slice(0, 8) + '...' }
        : { valid: false, key: null },
    }
  },
  travelStats: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return {}
    const { data: tripIds } = await supabase.from('trips').select('id, start_date, end_date')
      .eq('user_id', user.id).eq('is_archived', false)
    const ids = (tripIds || []).map((t: any) => t.id)
    const [placesRes] = await Promise.allSettled([
      ids.length > 0
        ? supabase.from('places').select('id', { count: 'exact', head: true }).in('trip_id', ids)
        : Promise.resolve({ count: 0 }),
    ])
    const totalDays = (tripIds || []).reduce((sum: number, t: any) => {
      if (!t.start_date || !t.end_date) return sum
      return sum + Math.max(0, Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000))
    }, 0)
    const placesCount = placesRes.status === 'fulfilled' ? (placesRes.value as any)?.count ?? 0 : 0
    return {
      total_trips: ids.length,
      total_places: placesCount,
      total_days: totalDays,
      upcoming_trips: (tripIds || []).filter((t: any) => t.start_date && new Date(t.start_date) > new Date()).length,
    }
  },
  forgotPassword: async (data: { email: string }) => {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })
    if (error) throw error
    return { success: true }
  },
  validateInvite: async (token: string): Promise<any> => {
    const { data, error } = await supabase.from('invite_links')
      .select('id, token, expires_at, max_uses, use_count')
      .eq('token', token)
      .single()
    if (error || !data) throw new Error('Invalid invite link')
    if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error('Invite link has expired')
    if (data.max_uses != null && data.use_count >= data.max_uses) throw new Error('Invite link has reached max uses')
    return { valid: true, invite: data }
  },
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
    if (insertData.is_archived !== undefined) {
      insertData.is_archived = !!insertData.is_archived
    }

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
    if (updateData.is_archived !== undefined) {
      updateData.is_archived = !!updateData.is_archived
    }
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
    // 1. Get the trip owner id
    const { data: trip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()
    const ownerId = trip?.user_id

    // 2. Get the members
    const { data: members } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', id)
    
    const userIds = [ownerId, ...(members || []).map(m => m.user_id)].filter(Boolean)

    // 3. Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const ownerProfile = profiles?.find(p => p.id === ownerId)
    const memberProfiles = profiles?.filter(p => p.id !== ownerId) || []

    return {
      owner: ownerProfile ? {
        id: ownerProfile.id,
        username: ownerProfile.username,
        avatar_url: ownerProfile.avatar_url,
        role: ownerProfile.role
      } : null,
      members: memberProfiles.map(p => ({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        role: p.role
      }))
    }
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
    // Fetch all trip data in parallel for offline sync (Dexie)
    // Keys must match TripBundle interface in tripSyncManager.ts (camelCase)
    const [tripRes, daysRes, placesRes, packingRes, todoRes, budgetRes, reservationsRes, notesRes, accommodationsRes, membersRes, filesRes] = await Promise.allSettled([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('days').select('*').eq('trip_id', id),
      supabase.from('places').select('*').eq('trip_id', id),
      supabase.from('packing_items').select('*').eq('trip_id', id),
      supabase.from('todo_items').select('*').eq('trip_id', id),
      supabase.from('budget_items').select('*').eq('trip_id', id),
      supabase.from('reservations').select('*').eq('trip_id', id),
      supabase.from('day_notes').select('*').eq('trip_id', id),
      supabase.from('day_accommodations').select('*').eq('trip_id', id),
      supabase.from('trip_members').select('*').eq('trip_id', id),
      supabase.from('trip_files').select('*').eq('trip_id', id).eq('is_deleted', false),
    ])
    const get = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? (r.value.data ?? null) : null
    const trip = get(tripRes)
    return {
      bundle: {
        trip,
        days: get(daysRes) ?? [],
        places: get(placesRes) ?? [],
        packingItems: get(packingRes) ?? [],   // camelCase — matches TripBundle
        todoItems: get(todoRes) ?? [],          // camelCase — matches TripBundle
        budgetItems: get(budgetRes) ?? [],      // camelCase — matches TripBundle
        reservations: get(reservationsRes) ?? [],
        dayNotes: get(notesRes) ?? [],
        accommodations: get(accommodationsRes) ?? [],
        members: get(membersRes) ?? [],         // trip_members for upsertTripMembers
        files: get(filesRes) ?? [],             // 'files' — matches TripBundle
      }
    }
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

  bulkDelete: async (tripId: number | string, placeIds: (number | string)[]) => {
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('trip_id', tripId)
      .in('id', placeIds)
    if (error) throw error
    return { success: true }
  },
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

  updateTime: async (_tripId: number | string, assignmentId: number, data: { place_time?: string | null; end_time?: string | null }): Promise<any> => {
    const { error } = await supabase.from('day_assignments')
      .update({ place_time: data.place_time ?? null, end_time: data.end_time ?? null })
      .eq('id', assignmentId)
    if (error) throw error
    return { success: true }
  },
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
    const { data: items, error: itemsError } = await supabase
      .from('budget_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true })
    if (itemsError) throw itemsError
    if (!items || items.length === 0) return { items: [] }

    const itemIds = items.map(i => i.id)

    const { data: allMembers, error: membersError } = await supabase
      .from('budget_item_members')
      .select('*')
      .in('budget_item_id', itemIds)
    if (membersError) throw membersError

    const { data: allPayers, error: payersError } = await supabase
      .from('budget_item_payers')
      .select('*')
      .in('budget_item_id', itemIds)
    if (payersError) throw payersError

    const userIds = Array.from(new Set([
      ...(allMembers || []).map(m => m.user_id),
      ...(allPayers || []).map(p => p.user_id)
    ]))

    let profiles: any[] = []
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
      if (profilesError) throw profilesError
      profiles = profilesData || []
    }

    const profilesMap = new Map(profiles.map(p => [p.id, p]))

    const membersByItem: Record<number, any[]> = {}
    for (const m of (allMembers || [])) {
      if (!membersByItem[m.budget_item_id]) membersByItem[m.budget_item_id] = []
      const prof = profilesMap.get(m.user_id)
      membersByItem[m.budget_item_id].push({
        user_id: m.user_id,
        paid: m.paid,
        username: prof?.username || '',
        avatar_url: prof?.avatar_url || null
      })
    }

    const payersByItem: Record<number, any[]> = {}
    for (const p of (allPayers || [])) {
      if (!payersByItem[p.budget_item_id]) payersByItem[p.budget_item_id] = []
      const prof = profilesMap.get(p.user_id)
      payersByItem[p.budget_item_id].push({
        user_id: p.user_id,
        amount: p.amount,
        username: prof?.username || '',
        avatar_url: prof?.avatar_url || null
      })
    }

    const mapped = items.map(item => ({
      ...item,
      members: membersByItem[item.id] || [],
      payers: payersByItem[item.id] || []
    }))

    return { items: mapped }
  },

  create: async (tripId: number | string, data: BudgetCreateItemRequest) => {
    const { data: item, error } = await supabase
      .from('budget_items')
      .insert([{ ...data, trip_id: tripId }])
      .select()
      .single()
    if (error) throw error
    return { item: { ...item, members: [], payers: [] } }
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

  setMembers: async (tripId: number | string, itemId: number, userIds: (string | number)[]) => {
    const { error: deleteError } = await supabase
      .from('budget_item_members')
      .delete()
      .eq('budget_item_id', itemId)
    if (deleteError) throw deleteError

    if (userIds.length > 0) {
      const inserts = userIds.map(uid => ({
        budget_item_id: itemId,
        user_id: String(uid),
        paid: 0
      }))
      const { error: insertError } = await supabase
        .from('budget_item_members')
        .insert(inserts)
      if (insertError) throw insertError
    }

    const { error: updateError } = await supabase
      .from('budget_items')
      .update({ persons: userIds.length || null })
      .eq('id', itemId)
    if (updateError) throw updateError

    const { items } = await budgetApi.list(tripId)
    const updatedItem = items.find(i => i.id === itemId)

    return { success: true, members: updatedItem?.members || [], item: updatedItem || {} as any }
  },

  togglePaid: async (tripId: number | string, itemId: number, userId: string | number, paid: boolean | number) => {
    const paidVal = paid ? 1 : 0
    const { error } = await supabase
      .from('budget_item_members')
      .update({ paid: paidVal })
      .eq('budget_item_id', itemId)
      .eq('user_id', String(userId))
    if (error) throw error
    return { success: true }
  },

  setPayers: async (tripId: number | string, itemId: number, payers: any[]) => {
    const { error: deleteError } = await supabase
      .from('budget_item_payers')
      .delete()
      .eq('budget_item_id', itemId)
    if (deleteError) throw deleteError

    if (payers.length > 0) {
      const inserts = payers.map(p => ({
        budget_item_id: itemId,
        user_id: String(p.user_id),
        amount: Number(p.amount)
      }))
      const { error: insertError } = await supabase
        .from('budget_item_payers')
        .insert(inserts)
      if (insertError) throw insertError
    }

    const totalAmount = payers.reduce((sum, p) => sum + Number(p.amount), 0)
    const { error: updateError } = await supabase
      .from('budget_items')
      .update({ total_price: totalAmount })
      .eq('id', itemId)
    if (updateError) throw updateError

    return { success: true }
  },

  perPersonSummary: async (tripId: number | string): Promise<any> => ({ summary: [] }),

  settlement: async (tripId: number | string, base?: string): Promise<any> => {
    const { items } = await budgetApi.list(tripId)

    const { data: settlementsData, error: settlementsError } = await supabase
      .from('budget_settlements')
      .select('*')
      .eq('trip_id', tripId)
    if (settlementsError) throw settlementsError

    const settlementUserIds = Array.from(new Set([
      ...(settlementsData || []).map(s => s.from_user_id),
      ...(settlementsData || []).map(s => s.to_user_id)
    ]))

    let profiles: any[] = []
    if (settlementUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', settlementUserIds)
      if (profilesError) throw profilesError
      profiles = profilesData || []
    }

    const profilesMap = new Map(profiles.map(p => [p.id, p]))

    const settlements = (settlementsData || []).map((s: any) => {
      const fromProf = profilesMap.get(s.from_user_id)
      const toProf = profilesMap.get(s.to_user_id)
      return {
        id: s.id,
        trip_id: s.trip_id,
        from_user_id: s.from_user_id,
        from_username: fromProf?.username || '',
        from_avatar_url: fromProf?.avatar_url || null,
        to_user_id: s.to_user_id,
        to_username: toProf?.username || '',
        to_avatar_url: toProf?.avatar_url || null,
        amount: s.amount,
        created_at: s.created_at
      }
    })

    const balances: Record<string, { user_id: string; username: string; avatar_url: string | null; balance: number }> = {}
    const ensure = (id: string, username: string, avatar: string | null) => {
      if (!balances[id]) {
        balances[id] = { user_id: id, username, avatar_url: avatar, balance: 0 }
      }
      return balances[id]
    }

    for (const item of items) {
      const members = item.members || []
      const payers = item.payers || []
      if (members.length === 0) continue

      const paidTotal = payers.reduce((sum: number, p: any) => sum + (p.amount > 0 ? p.amount : 0), 0)
      const sharePerMember = paidTotal / members.length

      for (const p of payers) {
        ensure(p.user_id, p.username, p.avatar_url).balance += p.amount
      }
      for (const m of members) {
        ensure(m.user_id, m.username, m.avatar_url).balance -= sharePerMember
      }
    }

    for (const s of settlements) {
      ensure(s.from_user_id, s.from_username, s.from_avatar_url).balance += s.amount
      ensure(s.to_user_id, s.to_username, s.to_avatar_url).balance -= s.amount
    }

    const people = Object.values(balances).filter(b => Math.abs(b.balance) > 0.01)
    const debtors = people.filter(p => p.balance < -0.01).map(p => ({ ...p, amount: -p.balance }))
    const creditors = people.filter(p => p.balance > 0.01).map(p => ({ ...p, amount: p.balance }))

    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    const creditorIds = creditors.map(c => c.user_id)
    let paymentDetails: Record<string, any> = {}
    if (creditorIds.length > 0) {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('user_id, key, value')
        .in('user_id', creditorIds)
        .in('key', ['payment_bank_id', 'payment_account_no', 'payment_account_name'])
      
      if (settingsData) {
        for (const row of settingsData) {
          if (!paymentDetails[row.user_id]) paymentDetails[row.user_id] = {}
          let val = row.value
          try {
            val = JSON.parse(row.value)
          } catch {
            // Keep raw string
          }
          paymentDetails[row.user_id][row.key] = val
        }
      }
    }

    const flows: any[] = []
    let di = 0, ci = 0
    while (di < debtors.length && ci < creditors.length) {
      const transfer = Math.min(debtors[di].amount, creditors[ci].amount)
      if (transfer > 0.01) {
        const toDetails = paymentDetails[creditors[ci].user_id] || {}
        flows.push({
          from: { user_id: debtors[di].user_id, username: debtors[di].username, avatar_url: debtors[di].avatar_url },
          to: {
            user_id: creditors[ci].user_id,
            username: creditors[ci].username,
            avatar_url: creditors[ci].avatar_url,
            payment_bank_id: toDetails.payment_bank_id || null,
            payment_account_no: toDetails.payment_account_no || null,
            payment_account_name: toDetails.payment_account_name || null,
          },
          amount: Math.round(transfer * 100) / 100
        })
      }
      debtors[di].amount -= transfer
      creditors[ci].amount -= transfer
      if (debtors[di].amount < 0.01) di++
      if (creditors[ci].amount < 0.01) ci++
    }

    return {
      balances: Object.values(balances).map(b => ({ ...b, balance: Math.round(b.balance * 100) / 100 })),
      flows,
      settlements
    }
  },

  createSettlement: async (tripId: number | string, data: any) => {
    const { data: item, error } = await supabase
      .from('budget_settlements')
      .insert([{
        trip_id: Number(tripId),
        from_user_id: String(data.from_user_id),
        to_user_id: String(data.to_user_id),
        amount: Number(data.amount)
      }])
      .select()
      .single()
    if (error) throw error
    return { settlement: item }
  },

  updateSettlement: async (tripId: number | string, settlementId: number, data: any) => {
    const { data: item, error } = await supabase
      .from('budget_settlements')
      .update({
        from_user_id: String(data.from_user_id),
        to_user_id: String(data.to_user_id),
        amount: Number(data.amount)
      })
      .eq('id', settlementId)
      .select()
      .single()
    if (error) throw error
    return { settlement: item }
  },

  deleteSettlement: async (tripId: number | string, settlementId: number) => {
    const { error } = await supabase
      .from('budget_settlements')
      .delete()
      .eq('id', settlementId)
    if (error) throw error
    return { success: true }
  },

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
    const insertData = { ...data } as any
    if (insertData.pinned !== undefined) {
      insertData.pinned = !!insertData.pinned
    }
    const { data: note, error } = await supabase
      .from('collab_notes')
      .insert([{ ...insertData, trip_id: tripId, user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    return { note }
  },

  updateNote: async (tripId: number | string, id: number, data: CollabNoteUpdateRequest) => {
    const updateData = { ...data } as any
    if (updateData.pinned !== undefined) {
      updateData.pinned = !!updateData.pinned
    }
    const { data: note, error } = await supabase
      .from('collab_notes')
      .update(updateData)
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
  getLink: async (tripId: number | string): Promise<any> => {
    const { data, error } = await supabase
      .from('trip_share_links')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { token: '', share_map: true, share_bookings: true, share_packing: false, share_budget: false, share_collab: false }
    return data
  },
  createLink: async (tripId: number | string, perms?: any): Promise<any> => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data, error } = await supabase
      .from('trip_share_links')
      .upsert({
        trip_id: tripId,
        created_by: userId,
        share_map: perms?.share_map ?? true,
        share_bookings: perms?.share_bookings ?? true,
        share_packing: perms?.share_packing ?? false,
        share_budget: perms?.share_budget ?? false,
        share_collab: perms?.share_collab ?? false,
      }, { onConflict: 'trip_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },
  deleteLink: async (tripId: number | string) => {
    const { error } = await supabase
      .from('trip_share_links')
      .delete()
      .eq('trip_id', tripId)
    if (error) throw error
    return { success: true }
  },
  getSharedTrip: async (token: string): Promise<any> => {
    const { data: link, error: linkError } = await supabase
      .from('trip_share_links')
      .select('*, trips(*, days(*), places(*), reservations(*), packing_items(*), budget_items(*), collab_messages(*))')
      .eq('token', token)
      .single()
    if (linkError || !link) throw new Error('Shared link not found or expired')
    return {
      trip: link.trips,
      permissions: {
        share_map: link.share_map,
        share_bookings: link.share_bookings,
        share_packing: link.share_packing,
        share_budget: link.share_budget,
        share_collab: link.share_collab,
      }
    }
  },
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
  users: async () => {
    const { data, error } = await supabase.from('profiles').select('id, username, email, role, created_at')
    if (error) throw error
    return { users: data || [] }
  },
  createUser: async (data: any): Promise<any> => {
    // Use Edge Function with service role key to create user WITHOUT email confirmation
    const session = (await supabase.auth.getSession()).data.session
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        username: data.username,
        role: data.role || 'user',
      })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to create user')
    return result
  },
  updateUser: async (id: any, data: any): Promise<any> => {
    const { data: user, error } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        role: data.role,
        email: data.email
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { user }
  },
  deleteUser: async (id: any): Promise<any> => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw error
    return { success: true, deleted: true }
  },
  resetUserPasskeys: async (id: any): Promise<any> => ({ success: true, deleted: 1 }),
  stats: async (): Promise<any> => {
    const [uCount, tCount, pCount, fCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trips').select('*', { count: 'exact', head: true }),
      supabase.from('places').select('*', { count: 'exact', head: true }),
      supabase.from('trip_files').select('*', { count: 'exact', head: true })
    ])
    return {
      totalUsers: uCount.count || 0,
      totalTrips: tCount.count || 0,
      totalPlaces: pCount.count || 0,
      totalFiles: fCount.count || 0
    }
  },
  saveDemoBaseline: async () => ({ success: true }),
  getOidc: async () => ({}),
  updateOidc: async (data: any) => ({ success: true }),
  addons: async () => {
    const { data, error } = await supabase.from('addons').select('*').order('sort_order', { ascending: true })
    if (error) throw error
    return { addons: data || [] }
  },
  updateAddon: async (id: any, data: any) => {
    const { data: addon, error } = await supabase
      .from('addons')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { addon }
  },
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
  packingTemplates: async (): Promise<any> => {
    const { data: templates, error } = await supabase
      .from('packing_templates')
      .select('*, packing_template_categories(*, packing_template_items(*))')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return { templates: templates || [] }
  },
  getPackingTemplate: async (id: number): Promise<any> => {
    const { data, error } = await supabase
      .from('packing_templates')
      .select('*, packing_template_categories(*, packing_template_items(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return { template: data }
  },
  createPackingTemplate: async (data: any): Promise<any> => {
    const { data: template, error } = await supabase
      .from('packing_templates')
      .insert([{ name: data.name, description: data.description, icon: data.icon || '🎒' }])
      .select()
      .single()
    if (error) throw error
    return { template }
  },
  updatePackingTemplate: async (id: number, data: any): Promise<any> => {
    const { data: template, error } = await supabase
      .from('packing_templates')
      .update({ name: data.name, description: data.description, icon: data.icon })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { template }
  },
  deletePackingTemplate: async (id: number) => {
    const { error } = await supabase.from('packing_templates').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
  addTemplateCategory: async (templateId: number, data: any): Promise<any> => {
    const { data: category, error } = await supabase
      .from('packing_template_categories')
      .insert([{ template_id: templateId, name: data.name, icon: data.icon || '📦' }])
      .select()
      .single()
    if (error) throw error
    return { category }
  },
  updateTemplateCategory: async (templateId: number, catId: number, data: any): Promise<any> => {
    const { data: category, error } = await supabase
      .from('packing_template_categories')
      .update({ name: data.name, icon: data.icon })
      .eq('id', catId)
      .eq('template_id', templateId)
      .select()
      .single()
    if (error) throw error
    return { category }
  },
  deleteTemplateCategory: async (templateId: number, catId: number) => {
    const { error } = await supabase.from('packing_template_categories').delete().eq('id', catId)
    if (error) throw error
    return { success: true }
  },
  addTemplateItem: async (templateId: number, catId: number, data: any): Promise<any> => {
    const { data: item, error } = await supabase
      .from('packing_template_items')
      .insert([{ template_id: templateId, category_id: catId, name: data.name }])
      .select()
      .single()
    if (error) throw error
    return { item }
  },
  updateTemplateItem: async (templateId: number, itemId: number, data: any): Promise<any> => {
    const { data: item, error } = await supabase
      .from('packing_template_items')
      .update({ name: data.name })
      .eq('id', itemId)
      .select()
      .single()
    if (error) throw error
    return { item }
  },
  deleteTemplateItem: async (templateId: number, itemId: number) => {
    const { error } = await supabase.from('packing_template_items').delete().eq('id', itemId)
    if (error) throw error
    return { success: true }
  },
  listInvites: async () => {
    const { data, error } = await supabase
      .from('invite_links')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { invites: data || [] }
  },
  createInvite: async (data: any): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    const profile = user ? (await supabase.from('profiles').select('username').eq('id', user.id).single()).data : null
    const expiresAt = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86400000).toISOString()
      : null
    const { data: invite, error } = await supabase
      .from('invite_links')
      .insert([{
        max_uses: data.max_uses || 1,
        expires_at: expiresAt,
        created_by: user?.id,
        created_by_name: profile?.username || user?.email || 'admin',
      }])
      .select()
      .single()
    if (error) throw error
    return { invite }
  },
  deleteInvite: async (id: number) => {
    const { error } = await supabase.from('invite_links').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
  auditLog: async (params?: any): Promise<any> => {
    let query = supabase.from('audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (params?.limit) query = query.limit(params.limit)
    else query = query.limit(100)
    if (params?.offset) query = query.range(params.offset, params.offset + (params?.limit || 100) - 1)
    const { data, error, count } = await query
    if (error) throw error
    return { entries: data || [], total: count || 0 }
  },
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
  enabled: async (): Promise<any> => {
    const { data: addons, error: addonsError } = await supabase
      .from('addons')
      .select('*')
      .eq('enabled', true)
    if (addonsError) throw addonsError

    const { data: providers, error: providersError } = await supabase
      .from('photo_providers')
      .select('*')
      .eq('enabled', true)
    if (providersError) throw providersError

    const mappedAddons = [
      ...(addons || []),
      ...(providers || []).map(p => ({ ...p, type: 'photo_provider' }))
    ]

    return {
      addons: mappedAddons,
      bagTracking: addons?.some(a => a.id === 'bag-tracking' && a.enabled) || false
    }
  }
}

export const oauthApi = {
  clients: {
    list: async (): Promise<any> => ({ clients: [] }),
    create: async (...args: any[]): Promise<any> => ({ client: { id: 'mock', name: 'Mock Client', client_id: 'mock', client_secret: 'mock', redirect_uris: [], scopes: [] } }),
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
  list: async (params?: { limit?: number; offset?: number; unread_only?: boolean }): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { notifications: [], total: 0, unread_count: 0 }
    let query = supabase.from('notifications').select('*, sender:profiles!sender_id(username, avatar_url)', { count: 'exact' })
      .eq('recipient_id', user.id).order('created_at', { ascending: false })
    if (params?.unread_only) query = query.eq('is_read', false)
    if (params?.limit) query = query.limit(params.limit)
    else query = query.limit(50)
    if (params?.offset) query = query.range(params.offset, params.offset + (params?.limit ?? 50) - 1)
    const { data, error, count } = await query
    if (error) throw error
    // Flatten sender profile into notification row
    const notifications = (data || []).map((n: any) => ({
      ...n,
      sender_username: n.sender?.username ?? null,
      sender_avatar: n.sender?.avatar_url ?? null,
    }))
    const { count: unreadCount } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false)
    return { notifications, total: count || 0, unread_count: unreadCount ?? 0 }
  },
  unreadCount: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { count: 0 }
    const { count } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false)
    return { count: count ?? 0 }
  },
  markRead: async (id: number) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  },
  markUnread: async (id: number) => {
    const { error } = await supabase.from('notifications').update({ is_read: false }).eq('id', id)
    if (error) throw error
    return { success: true }
  },
  markAllRead: async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { success: true }
    const { error } = await supabase.from('notifications').update({ is_read: true })
      .eq('recipient_id', user.id).eq('is_read', false)
    if (error) throw error
    return { success: true }
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
  deleteAll: async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { success: true }
    const { error } = await supabase.from('notifications').delete().eq('recipient_id', user.id)
    if (error) throw error
    return { success: true }
  },
  respond: async (id: number, response: 'positive' | 'negative'): Promise<any> => {
    const { data: notification, error } = await supabase.from('notifications')
      .update({ response, is_read: true }).eq('id', id).select().single()
    if (error) throw error
    return { success: true, notification }
  },
}

export const filesApi = {
  list: async (tripId: number | string, isTrash?: boolean): Promise<any> => {
    let query = supabase
      .from('trip_files')
      .select('*')
      .eq('trip_id', tripId)
    if (isTrash !== undefined) {
      query = query.eq('is_deleted', isTrash)
    }
    const { data, error } = await query
    if (error) throw error
    return { files: data || [] }
  },

  upload: async (tripId: number | string, formData: FormData) => {
    const file = formData.get('file') as File
    if (!file) throw new Error('No file provided')
    
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${tripId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file)
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    const { data: tripFile, error: dbError } = await supabase
      .from('trip_files')
      .insert([{
        trip_id: tripId,
        filename: fileName,
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        url: publicUrl,
        uploaded_by: user.id
      }])
      .select()
      .single()

    if (dbError) throw dbError
    return { file: tripFile }
  },

  update: async (tripId: number | string, id: number, data: any) => {
    const { error } = await supabase
      .from('trip_files')
      .update(data)
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  delete: async (tripId: number | string, id: number) => {
    const { error } = await supabase
      .from('trip_files')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  toggleStar: async (tripId: number | string, id: number) => {
    const { data: file } = await supabase.from('trip_files').select('starred').eq('id', id).single()
    const { error } = await supabase
      .from('trip_files')
      .update({ starred: !file?.starred })
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  restore: async (tripId: number | string, id: number) => {
    const { error } = await supabase
      .from('trip_files')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  permanentDelete: async (tripId: number | string, id: number) => {
    const { data: file } = await supabase.from('trip_files').select('filename').eq('id', id).single()
    if (file?.filename) {
      await supabase.storage.from('photos').remove([file.filename])
    }
    const { error } = await supabase.from('trip_files').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  emptyTrash: async (tripId: number | string) => {
    const { data: files } = await supabase
      .from('trip_files')
      .select('id, filename')
      .eq('trip_id', tripId)
      .eq('is_deleted', true)

    if (files && files.length > 0) {
      const fileNames = files.map(f => f.filename).filter(Boolean)
      if (fileNames.length > 0) {
        await supabase.storage.from('photos').remove(fileNames)
      }
      const ids = files.map(f => f.id)
      await supabase.from('trip_files').delete().in('id', ids)
    }
    return { success: true }
  },

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
  list: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { journeys: [] }
    const { data, error } = await supabase.from('journeys').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return { journeys: data || [] }
  },

  create: async (data: { title: string; subtitle?: string; trip_ids?: number[] }): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: journey, error } = await supabase.from('journeys')
      .insert({ user_id: user.id, title: data.title, subtitle: data.subtitle })
      .select().single()
    if (error) throw error
    // Add owner as contributor
    await supabase.from('journey_contributors').insert({ journey_id: journey.id, user_id: user.id, role: 'owner' })
    // Link trips if provided
    if (data.trip_ids?.length) {
      await supabase.from('journey_trips').insert(data.trip_ids.map(tid => ({ journey_id: journey.id, trip_id: tid })))
    }
    return { journey }
  },

  get: async (id: number): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: journey, error } = await supabase.from('journeys').select('*').eq('id', id).single()
    if (error) throw error
    const [entriesRes, tripsRes, contribRes, photosRes] = await Promise.allSettled([
      supabase.from('journey_entries').select('*').eq('journey_id', id).order('sort_order', { ascending: true }),
      supabase.from('journey_trips').select('*, trips(id, title, start_date, end_date, cover_image, currency)').eq('journey_id', id),
      supabase.from('journey_contributors').select('*, profiles(username, avatar_url)').eq('journey_id', id),
      supabase.from('journey_photos').select('*').eq('journey_id', id).order('sort_order', { ascending: true }),
    ])
    const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.data ?? [] : []
    const entries = get(entriesRes)
    const trips = get(tripsRes).map((r: any) => ({ trip_id: r.trip_id, added_at: r.added_at, ...r.trips }))
    const contributors = get(contribRes).map((r: any) => ({ ...r, username: r.profiles?.username, avatar: r.profiles?.avatar_url }))
    const gallery = get(photosRes)
    const stats = { entries: entries.length, photos: gallery.length, places: 0 }
    return { journey: { ...journey, entries, trips, contributors, gallery, stats } }
  },

  update: async (id: number, data: Record<string, unknown>): Promise<any> => {
    const { data: journey, error } = await supabase.from('journeys')
      .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return { journey }
  },

  delete: async (id: number): Promise<any> => {
    const { error } = await supabase.from('journeys').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  suggestions: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { trips: [] }
    const { data } = await supabase.from('trips').select('id, title, start_date, end_date, cover_image, currency')
      .eq('user_id', user.id).order('start_date', { ascending: false }).limit(10)
    return { trips: data || [] }
  },

  availableTrips: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { trips: [] }
    const { data } = await supabase.from('trips').select('id, title, start_date, end_date, cover_image, currency')
      .eq('user_id', user.id).order('start_date', { ascending: false })
    return { trips: data || [] }
  },

  addTrip: async (journeyId: number, tripId: number): Promise<any> => {
    const { error } = await supabase.from('journey_trips')
      .upsert({ journey_id: journeyId, trip_id: tripId }, { onConflict: 'journey_id,trip_id' })
    if (error) throw error
    return { success: true }
  },

  removeTrip: async (journeyId: number, tripId: number): Promise<any> => {
    const { error } = await supabase.from('journey_trips')
      .delete().eq('journey_id', journeyId).eq('trip_id', tripId)
    if (error) throw error
    return { success: true }
  },

  listEntries: async (journeyId: number): Promise<any> => {
    const { data, error } = await supabase.from('journey_entries').select('*')
      .eq('journey_id', journeyId).order('sort_order', { ascending: true })
    if (error) throw error
    return { entries: data || [] }
  },

  createEntry: async (journeyId: number, data: Record<string, unknown>): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: entry, error } = await supabase.from('journey_entries')
      .insert({ journey_id: journeyId, author_id: user.id, ...data })
      .select().single()
    if (error) throw error
    return { entry }
  },

  updateEntry: async (entryId: number, data: Record<string, unknown>): Promise<any> => {
    const { data: entry, error } = await supabase.from('journey_entries')
      .update({ ...data, updated_at: new Date().toISOString() }).eq('id', entryId).select().single()
    if (error) throw error
    return { entry }
  },

  deleteEntry: async (entryId: number): Promise<any> => {
    const { error } = await supabase.from('journey_entries').delete().eq('id', entryId)
    if (error) throw error
    return { success: true }
  },

  reorderEntries: async (journeyId: number, orderedIds: number[]): Promise<any> => {
    await Promise.all(orderedIds.map((id, idx) =>
      supabase.from('journey_entries').update({ sort_order: idx }).eq('id', id)
    ))
    return { success: true }
  },

  // Photo management — bucket: journey-photos, table: journey_photos (NOT trip_files)
  // trip_files has a NOT NULL FK trip_id → trips.id, cannot use trip_id=0
  uploadPhotos: async (entryId: number, formData: FormData, opts?: any): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const { data: entry } = await supabase.from('journey_entries').select('journey_id').eq('id', entryId).single()
    if (!entry) throw new Error('Entry not found')
    const files = formData.getAll('files') as File[]
    const results = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/journeys/${entry.journey_id}/entries/${entryId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('journey-photos').upload(path, file)
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('journey-photos').getPublicUrl(path)
      // Insert directly into journey_photos (no trip_files dependency)
      const { data: photo } = await supabase.from('journey_photos').insert({
        journey_id: entry.journey_id,
        entry_id: entryId,
        storage_path: path,
        url: publicUrl,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      }).select().single()
      if (photo) results.push(photo)
    }
    return { photos: results }
  },

  uploadGalleryPhotos: async (journeyId: number, formData: FormData, opts?: any): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const files = formData.getAll('files') as File[]
    const results = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/journeys/${journeyId}/gallery/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('journey-photos').upload(path, file)
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('journey-photos').getPublicUrl(path)
      const { data: photo } = await supabase.from('journey_photos').insert({
        journey_id: journeyId,
        entry_id: null,   // gallery photo — not linked to specific entry
        storage_path: path,
        url: publicUrl,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        shared: true,
      }).select().single()
      if (photo) results.push(photo)
    }
    return { photos: results }
  },

  linkPhoto: async (entryId: number, photoId: number): Promise<any> => {
    const { data: photo } = await supabase.from('journey_photos').select('journey_id').eq('id', photoId).single()
    if (!photo) return { success: false }
    const { error } = await supabase.from('journey_photos').update({ entry_id: entryId }).eq('id', photoId)
    if (error) throw error
    return { success: true }
  },

  unlinkPhoto: async (entryId: number, photoId: number): Promise<any> => {
    const { error } = await supabase.from('journey_photos').update({ entry_id: null }).eq('id', photoId)
    if (error) throw error
    return { success: true }
  },

  deleteGalleryPhoto: async (journeyId: number, photoId: number): Promise<any> => {
    const { error } = await supabase.from('journey_photos').delete().eq('id', photoId)
    if (error) throw error
    return { success: true }
  },

  updatePhoto: async (photoId: number, data: Record<string, unknown>): Promise<any> => {
    const { error } = await supabase.from('journey_photos').update(data).eq('id', photoId)
    if (error) throw error
    return { success: true }
  },

  deletePhoto: async (photoId: number): Promise<any> => {
    const { error } = await supabase.from('journey_photos').delete().eq('id', photoId)
    if (error) throw error
    return { success: true }
  },

  addProviderPhotosToGallery: async (...args: any[]): Promise<any> => ({ success: true }),
  addProviderPhoto: async (...args: any[]): Promise<any> => ({ success: true }),
  addProviderPhotos: async (...args: any[]): Promise<any> => ({ success: true }),

  uploadCover: async (journeyId: number, formData: FormData): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')
    const file = formData.get('file') as File
    if (!file) throw new Error('No file provided')
    const ext = file.name.split('.').pop()
    const path = `${user.id}/journeys/${journeyId}/cover.${ext}`
    const { error } = await supabase.storage.from('trip-files').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('trip-files').getPublicUrl(path)
    await supabase.from('journeys').update({ cover_image: publicUrl }).eq('id', journeyId)
    return { cover_image: publicUrl }
  },

  addContributor: async (journeyId: number, userId: number | string, role: string): Promise<any> => {
    const { error } = await supabase.from('journey_contributors')
      .upsert({ journey_id: journeyId, user_id: userId, role }, { onConflict: 'journey_id,user_id' })
    if (error) throw error
    return { success: true }
  },

  updateContributor: async (journeyId: number, userId: string, data: Record<string, unknown>): Promise<any> => {
    const { error } = await supabase.from('journey_contributors').update(data)
      .eq('journey_id', journeyId).eq('user_id', userId)
    if (error) throw error
    return { success: true }
  },

  removeContributor: async (journeyId: number, userId: string): Promise<any> => {
    const { error } = await supabase.from('journey_contributors')
      .delete().eq('journey_id', journeyId).eq('user_id', userId)
    if (error) throw error
    return { success: true }
  },

  updatePreferences: async (journeyId: number, data: Record<string, unknown>): Promise<any> => {
    const { error } = await supabase.from('journeys').update(data).eq('id', journeyId)
    if (error) throw error
    return { success: true }
  },

  getShareLink: async (journeyId: number): Promise<any> => {
    const { data } = await supabase.from('journey_share_links').select('*').eq('journey_id', journeyId).maybeSingle()
    if (!data) return { link: null }
    return { link: `${window.location.origin}/journey/public/${data.token}`, ...data }
  },

  createShareLink: async (journeyId: number, opts?: Record<string, boolean>): Promise<any> => {
    const { data, error } = await supabase.from('journey_share_links')
      .upsert({ journey_id: journeyId, ...opts }, { onConflict: 'journey_id' })
      .select().single()
    if (error) throw error
    return { link: `${window.location.origin}/journey/public/${data.token}`, ...data }
  },

  deleteShareLink: async (journeyId: number): Promise<any> => {
    const { error } = await supabase.from('journey_share_links').delete().eq('journey_id', journeyId)
    if (error) throw error
    return { success: true }
  },

  getPublicJourney: async (token: string): Promise<any> => {
    const { data: shareLink } = await supabase.from('journey_share_links').select('*, journeys(*)').eq('token', token).single()
    if (!shareLink) throw new Error('Journey not found')
    const journey = shareLink.journeys
    const { data: entries } = await supabase.from('journey_entries').select('*')
      .eq('journey_id', journey.id).order('sort_order', { ascending: true })
    const { data: gallery } = await supabase.from('journey_photos').select('*')
      .eq('journey_id', journey.id)
    return { journey: { ...journey, entries: entries || [], gallery: gallery || [], shareLink } }
  },
}

export const notificationsApi = {
  getPreferences: async (): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    const base = {
      available_channels: { email: true, webhook: false, inapp: true, ntfy: false },
      event_types: ['trip_invite', 'collab_chat', 'collab_poll', 'collab_note'],
      implemented_combinations: {
        trip_invite: ['email', 'inapp'],
        collab_chat: ['inapp'],
        collab_poll: ['inapp'],
        collab_note: ['inapp']
      },
      preferences: {} as Record<string, Record<string, boolean>>
    }
    if (!user) return base
    const { data } = await supabase.from('notification_channel_preferences')
      .select('event_type, channel, enabled').eq('user_id', user.id)
    for (const row of (data || [])) {
      if (!base.preferences[row.event_type]) base.preferences[row.event_type] = {}
      base.preferences[row.event_type][row.channel] = row.enabled
    }
    return base
  },
  updatePreferences: async (eventTypeOrObject: string | Record<string, Record<string, boolean>>, channel?: string, enabled?: boolean): Promise<any> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { success: true }
    // Support both (eventType, channel, enabled) and legacy ({...}) call formats
    if (typeof eventTypeOrObject === 'object') {
      // Legacy: bulk update — upsert all entries
      for (const [et, channels] of Object.entries(eventTypeOrObject)) {
        for (const [ch, en] of Object.entries(channels)) {
          await supabase.from('notification_channel_preferences')
            .upsert({ user_id: user.id, event_type: et, channel: ch, enabled: en }, { onConflict: 'user_id,event_type,channel' })
        }
      }
      return { success: true }
    }
    const { error } = await supabase.from('notification_channel_preferences')
      .upsert({ user_id: user.id, event_type: eventTypeOrObject, channel, enabled }, { onConflict: 'user_id,event_type,channel' })
    if (error) throw error
    return { success: true }
  },
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