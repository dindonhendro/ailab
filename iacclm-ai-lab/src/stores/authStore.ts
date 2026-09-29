import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
  signIn:     (email: string, password: string) => Promise<{ error?: string }>
  signUp:     (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signOut:    () => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,
  error:   null,

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    if (data?.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      set({ user: { id: data.user.id, email: data.user.email ?? '', full_name: data.user.user_metadata?.full_name ?? data.user.email, role: profile?.role ?? 'dokter' } as UserProfile })
    }
    return {}
  },

  signUp: async (email, password, fullName) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    if (data?.user) {
      set({ user: { id: data.user.id, email: data.user.email ?? '', full_name: fullName, role: 'dokter' } as UserProfile })
    }
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  initialize: async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) {
        const u = data.user
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', u.id)
          .single()
        set({
          user: { id: u.id, email: u.email ?? '', full_name: u.user_metadata?.full_name ?? u.email, role: profile?.role ?? 'dokter' } as UserProfile,
          loading: false,
        })
      } else {
        set({ user: null, loading: false })
      }
    } catch {
      set({ user: null, loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))

