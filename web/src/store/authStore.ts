/**
 * 认证状态与操作
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
  login: (phone: string, password: string) => Promise<void>
  loginWithUsername: (username: string, password: string) => Promise<void>
  loginWithWeChat: (openid: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
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

      login: async (phone: string, password: string) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.phoneLoginOrRegister({ phone, password })
          const token = data.access_token
          set({ token })
          const { data: user } = await authApi.me()
          set({ user, isLoading: false, isChecked: true })
        } catch (e: unknown) {
          set({ isLoading: false })
          throw e
        }
      },

      loginWithUsername: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login({ username, password })
          const token = data.access_token
          set({ token })
          const { data: user } = await authApi.me()
          set({ user, isLoading: false, isChecked: true })
        } catch (e: unknown) {
          set({ isLoading: false })
          throw e
        }
      },

      loginWithWeChat: async (openid: string) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.wechatMockLogin({ openid })
          const token = data.access_token
          set({ token })
          const { data: user } = await authApi.me()
          set({ user, isLoading: false, isChecked: true })
        } catch (e: unknown) {
          set({ isLoading: false })
          throw e
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true })
        try {
          await authApi.register({ username, email, password })
          await get().loginWithUsername(username, password)
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
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (_state, err) => {
        if (err) return
        const store = useAuthStore.getState()
        if (store.token) store.fetchMe()
        else useAuthStore.setState({ isChecked: true })
      },
    }
  )
)
