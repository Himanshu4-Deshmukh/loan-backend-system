import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  userid: string
  name: string
  email?: string
  role: 'admin' | 'subadmin' | 'user' | 'viewer'
  permissions: string[]
  lastLogin?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (userid: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  updateProfile: (data: Partial<User>) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (userid: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login({ userid, password })
          
          if (response.success) {
            const { user, accessToken } = response
            set({
              user,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
            })
            toast.success(`Welcome back, ${user.name}!`)
            return true
          } else {
            toast.error(response.message || 'Login failed')
            set({ isLoading: false })
            return false
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed'
          toast.error(message)
          set({ isLoading: false })
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        toast.success('Logged out successfully')
      },

      checkAuth: () => {
        const { token } = get()
        if (token) {
          // Validate token with backend
          authApi.validateSession()
            .then((response) => {
              if (response.success) {
                set({ isAuthenticated: true })
              } else {
                get().logout()
              }
            })
            .catch(() => {
              get().logout()
            })
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const response = await authApi.updateProfile(data)
          if (response.success) {
            set((state) => ({
              user: state.user ? { ...state.user, ...data } : null,
            }))
            toast.success('Profile updated successfully')
            return true
          } else {
            toast.error(response.message || 'Update failed')
            return false
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Update failed'
          toast.error(message)
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)