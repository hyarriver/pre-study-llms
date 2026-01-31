/**
 * 认证状态与操作：昵称登录/注册
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isChecked: boolean
  login: (nickname: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isChecked: false,

      login: async (nickname: string, password: string) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.nicknameLoginOrRegister({ nickname, password })
          set({ token: data.access_token })
          const { data: user } = await authApi.me()
          set({ user, isLoading: false, isChecked: true })
        } catch (e: unknown) {
          set({ isLoading: false })
          throw e
        }
      },

      logout: () => set({ user: null, token: null }),

      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),

      fetchMe: async () => {
        const { token } = get()
        if (!token) {
          set({ isChecked: true })
          return
        }
        try {
          const { data } = await authApi.me()
          set({ user: data, isChecked: true })
        } catch {
          get().logout()
          set({ isChecked: true })
        }
      },
    }),
    {
      name: 'dive-llm-auth',
      partialize: (s) => ({ token: s.token }),
      onRehydrateStorage: () => (_state, err) => {
        if (err) return
        const store = useAuthStore.getState()
        if (store.token) store.fetchMe()
        else useAuthStore.setState({ isChecked: true })
      },
    }
  )
)
