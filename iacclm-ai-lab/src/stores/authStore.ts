import { create } from 'zustand'
import { insforge } from '../lib/insforge'
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
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    if (data?.user) {
      set({ user: { id: data.user.id, email: data.user.email, full_name: (data.user as unknown as { name?: string }).name } as UserProfile })
    }
    return {}
  },

  signUp: async (email, password, fullName) => {
    set({ error: null })
    // InsForge signUp accepts: { email, password, name?, redirectTo?, autoConfirm? }
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name: fullName,
    })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    if (data?.user) {
      set({ user: { id: data.user.id, email: data.user.email, full_name: fullName } as UserProfile })
    }
    return {}
  },

  signOut: async () => {
    await insforge.auth.signOut()
    set({ user: null })
  },

  // InsForge has no onAuthStateChange; poll once on initialize
  initialize: async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (!error && data?.user) {
        const u = data.user as unknown as { id: string; email: string; name?: string }
        set({
          user: { id: u.id, email: u.email, full_name: u.name } as UserProfile,
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
