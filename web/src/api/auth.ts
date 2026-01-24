/**
 * 认证相关 API
 */
import api from './client'
import type { User, Token } from '@/types'

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<User>('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post<Token>('/auth/login', data),
  phoneLoginOrRegister: (data: { phone: string; password: string }) =>
    api.post<Token>('/auth/phone/login-or-register', data),
  wechatMockLogin: (data: { openid: string }) =>
    api.post<Token>('/auth/wechat/mock-login', data),
  me: () => api.get<User>('/auth/me'),
}
