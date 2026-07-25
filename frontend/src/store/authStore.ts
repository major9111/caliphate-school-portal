/**
 * FUGUSAU Portal — Auth Store (Redesigned)
 * Role is fully determined by the backend JWT response.
 * No client-side role selection — the server assigns it.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '@/services/api'

export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'lecturer' | 'admin' | 'parent'
  is_verified: boolean
  two_fa_enabled: boolean
  profile_photo: string | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login — role is automatically determined by the backend.
       * The returned `user.role` field is the source of truth.
       * There is no client-side role parameter sent with this request.
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await authAPI.login(email, password)
          const { access, refresh, user } = data
          set({
            user,
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err: any) {
          const message = err.response?.data?.detail || 'Invalid credentials. Please try again.'
          set({ isLoading: false, error: message, isAuthenticated: false })
          throw err
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try { if (refreshToken) await authAPI.logout(refreshToken) } catch (_) { /* ignore */ }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        try {
          const { data } = await authAPI.me()
          set({ user: data })
        } catch (_) { /* ignore */ }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fugusau-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
