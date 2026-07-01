import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../api/supabase'
import { connect, disconnect } from '../api/websocket'
import type { User } from '../types'
import { getApiErrorMessage } from '../types'
import { tripSyncManager } from '../sync/tripSyncManager'
import { reopenForUser, deleteCurrentUserDb } from '../db/offlineDb'
import { setAuthed } from '../sync/authGate'
import { unregisterSyncTriggers } from '../sync/syncTriggers'
import { useSystemNoticeStore } from './systemNoticeStore.js'

interface AuthResponse {
  user: User
  token: string
}

export type LoginResult = AuthResponse | { mfa_required: true; mfa_token: string }

interface AvatarResponse {
  avatar_url: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authCheckFailed: boolean
  error: string | null
  demoMode: boolean
  devMode: boolean
  isPrerelease: boolean
  appVersion: string
  hasMapsKey: boolean
  serverTimezone: string
  appRequireMfa: boolean
  tripRemindersEnabled: boolean
  placesPhotosEnabled: boolean
  placesAutocompleteEnabled: boolean
  placesDetailsEnabled: boolean

  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>
  completeMfaLogin: (mfaToken: string, code: string, rememberMe?: boolean) => Promise<AuthResponse>
  register: (username: string, email: string, password: string, invite_token?: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  loadUser: (opts?: { silent?: boolean }) => Promise<void>
  updateMapsKey: (key: string | null) => Promise<void>
  updateApiKeys: (keys: Record<string, string | null>) => Promise<void>
  updateProfile: (profileData: Partial<User>) => Promise<void>
  uploadAvatar: (file: File) => Promise<AvatarResponse>
  deleteAvatar: () => Promise<void>
  setDemoMode: (val: boolean) => void
  setDevMode: (val: boolean) => void
  setIsPrerelease: (val: boolean) => void
  setAppVersion: (val: string) => void
  setHasMapsKey: (val: boolean) => void
  setServerTimezone: (tz: string) => void
  setAppRequireMfa: (val: boolean) => void
  setTripRemindersEnabled: (val: boolean) => void
  setPlacesPhotosEnabled: (val: boolean) => void
  setPlacesAutocompleteEnabled: (val: boolean) => void
  setPlacesDetailsEnabled: (val: boolean) => void
  demoLogin: () => Promise<AuthResponse>
}

let authSequence = 0

async function onAuthSuccess(userId: string): Promise<void> {
  setAuthed(true)
  try {
    await reopenForUser(userId)
  } catch (err) {
    console.error('[auth] failed to open user-scoped offline DB', err)
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      authCheckFailed: false,
      error: null,
      demoMode: localStorage.getItem('demo_mode') === 'true',
      devMode: false,
      isPrerelease: false,
      appVersion: '',
      hasMapsKey: false,
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      appRequireMfa: false,
      tripRemindersEnabled: false,
      placesPhotosEnabled: true,
      placesAutocompleteEnabled: true,
      placesDetailsEnabled: true,

      login: async (email: string, password: string) => {
        authSequence++
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          if (!data.user) throw new Error('Login failed')

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError
          }

          const mappedUser: User = {
            id: data.user.id,
            username: profile?.username || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || '',
            role: (profile?.role as 'admin' | 'user') || 'user',
            avatar_url: profile?.avatar_url || null,
            maps_api_key: profile?.maps_api_key || null,
            created_at: data.user.created_at,
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          await onAuthSuccess(mappedUser.id)
          connect()
          tripSyncManager.syncAll().catch(console.error)
          useSystemNoticeStore.getState().fetch()
          return { user: mappedUser, token: data.session?.access_token || '' }
        } catch (err: unknown) {
          const error = getApiErrorMessage(err, 'Login failed')
          set({ isLoading: false, error })
          throw new Error(error)
        }
      },

      completeMfaLogin: async (mfaToken: string, code: string) => {
        authSequence++
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.mfa.verify({
            factorId: mfaToken,
            challengeId: '', // To be filled if challenge-based
            code: code.replace(/\s/g, ''),
          })
          if (error) throw error
          
          const session = (await supabase.auth.getSession()).data.session
          if (!session || !session.user) throw new Error('Session missing after MFA verification')

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          const mappedUser: User = {
            id: session.user.id,
            username: profile?.username || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: (profile?.role as 'admin' | 'user') || 'user',
            avatar_url: profile?.avatar_url || null,
            maps_api_key: profile?.maps_api_key || null,
            created_at: session.user.created_at,
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          await onAuthSuccess(mappedUser.id)
          connect()
          tripSyncManager.syncAll().catch(console.error)
          useSystemNoticeStore.getState().fetch()
          return { user: mappedUser, token: session.access_token }
        } catch (err: unknown) {
          const error = getApiErrorMessage(err, 'Verification failed')
          set({ isLoading: false, error })
          throw new Error(error)
        }
      },

      register: async (username: string, email: string, password: string) => {
        authSequence++
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username }
            }
          })
          if (error) throw error
          if (!data.user) throw new Error('Registration failed')

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          const mappedUser: User = {
            id: data.user.id,
            username: profile?.username || username,
            email: data.user.email || email,
            role: (profile?.role as 'admin' | 'user') || 'user',
            avatar_url: profile?.avatar_url || null,
            maps_api_key: profile?.maps_api_key || null,
            created_at: data.user.created_at,
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          await onAuthSuccess(mappedUser.id)
          connect()
          tripSyncManager.syncAll().catch(console.error)
          useSystemNoticeStore.getState().fetch()
          return { user: mappedUser, token: data.session?.access_token || '' }
        } catch (err: unknown) {
          const error = getApiErrorMessage(err, 'Registration failed')
          set({ isLoading: false, error })
          throw new Error(error)
        }
      },

      logout: async () => {
        setAuthed(false)
        set({ isAuthenticated: false })
        unregisterSyncTriggers()
        disconnect()
        useSystemNoticeStore.getState().reset()
        await supabase.auth.signOut().catch(() => {})
        if ('caches' in window) {
          await Promise.all([
            caches.delete('api-data').catch(() => {}),
            caches.delete('user-uploads').catch(() => {}),
          ])
        }
        await deleteCurrentUserDb().catch(console.error)
        set({
          user: null,
          isAuthenticated: false,
          authCheckFailed: false,
          error: null,
        })
      },

      loadUser: async (opts?: { silent?: boolean }) => {
        const seq = authSequence
        const silent = !!opts?.silent
        if (!silent) set({ isLoading: true })
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError
          if (!session || !session.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              authCheckFailed: false,
            })
            return
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError) throw profileError

          if (seq !== authSequence) return

          const mappedUser: User = {
            id: session.user.id,
            username: profile.username || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: (profile.role as 'admin' | 'user') || 'user',
            avatar_url: profile.avatar_url || null,
            maps_api_key: profile.maps_api_key || null,
            created_at: session.user.created_at,
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            authCheckFailed: false,
          })
          await onAuthSuccess(mappedUser.id)
          connect()
        } catch (err: unknown) {
          if (seq !== authSequence) return
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            authCheckFailed: true,
          })
        }
      },

      updateMapsKey: async (key: string | null) => {
        try {
          const user = get().user
          if (!user) throw new Error('Not authenticated')
          const { error } = await supabase
            .from('profiles')
            .update({ maps_api_key: key })
            .eq('id', user.id)
          if (error) throw error
          set((state) => ({
            user: state.user ? { ...state.user, maps_api_key: key || null } : null,
            hasMapsKey: !!key,
          }))
        } catch (err: unknown) {
          throw new Error(getApiErrorMessage(err, 'Error saving API key'))
        }
      },

      updateApiKeys: async (keys: Record<string, string | null>) => {
        try {
          const user = get().user
          if (!user) throw new Error('Not authenticated')
          const { error } = await supabase
            .from('profiles')
            .update(keys)
            .eq('id', user.id)
          if (error) throw error
          set((state) => ({
            user: state.user ? { ...state.user, ...keys } : null
          }))
        } catch (err: unknown) {
          throw new Error(getApiErrorMessage(err, 'Error saving API keys'))
        }
      },

      updateProfile: async (profileData: Partial<User>) => {
        try {
          const user = get().user
          if (!user) throw new Error('Not authenticated')
          const { error } = await supabase
            .from('profiles')
            .update({
              username: profileData.username,
              avatar_url: profileData.avatar_url
            })
            .eq('id', user.id)
          if (error) throw error
          set((state) => ({
            user: state.user ? { ...state.user, ...profileData } : null
          }))
        } catch (err: unknown) {
          throw new Error(getApiErrorMessage(err, 'Error updating profile'))
        }
      },

      uploadAvatar: async (file: File) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', user.id)

        if (updateError) throw updateError

        set((state) => ({
          user: state.user ? { ...state.user, avatar_url: data.publicUrl } : null
        }))

        return { avatar_url: data.publicUrl }
      },

      deleteAvatar: async () => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user.id)

        if (updateError) throw updateError

        set((state) => ({
          user: state.user ? { ...state.user, avatar_url: null } : null
        }))
      },

      setDemoMode: (val: boolean) => {
        if (val) localStorage.setItem('demo_mode', 'true')
        else localStorage.removeItem('demo_mode')
        set({ demoMode: val })
      },

      setDevMode: (val: boolean) => set({ devMode: val }),
      setIsPrerelease: (val: boolean) => set({ isPrerelease: val }),
      setAppVersion: (val: string) => set({ appVersion: val }),
      setHasMapsKey: (val: boolean) => set({ hasMapsKey: val }),
      setServerTimezone: (tz: string) => set({ serverTimezone: tz }),
      setAppRequireMfa: (val: boolean) => set({ appRequireMfa: val }),
      setTripRemindersEnabled: (val: boolean) => set({ tripRemindersEnabled: val }),
      setPlacesPhotosEnabled: (val: boolean) => set({ placesPhotosEnabled: val }),
      setPlacesAutocompleteEnabled: (val: boolean) => set({ placesAutocompleteEnabled: val }),
      setPlacesDetailsEnabled: (val: boolean) => set({ placesDetailsEnabled: val }),

      demoLogin: async () => {
        // Fallback or demo login stub
        throw new Error('Demo login not supported on Supabase integration')
      },
    }),
    {
      name: 'trek_auth_snapshot',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user ? {
          id: state.user.id,
          username: state.user.username,
          email: state.user.email,
          role: state.user.role,
          avatar_url: state.user.avatar_url,
          mfa_enabled: state.user.mfa_enabled,
          must_change_password: state.user.must_change_password,
        } : null,
      }),
    }
  )
)
