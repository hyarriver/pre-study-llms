/**
 * 认证相关 API：昵称登录/注册
 */
import api from './client'
import type { User, Token } from '@/types'

export const authApi = {
  nicknameLoginOrRegister: (data: { nickname: string; password: string }) =>
    api.post<Token>('/auth/nickname/login-or-register', data),
  me: () => api.get<User>('/auth/me'),
}
