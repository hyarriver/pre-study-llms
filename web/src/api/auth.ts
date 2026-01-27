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
  wechatAuthorize: (params?: { redirect?: string }) =>
    api.get<{ authorize_url: string }>('/auth/wechat/authorize', {
      params: { redirect: params?.redirect ?? '/chapters' },
    }),
  wechatCallback: (data: { code: string }) =>
    api.post<Token>('/auth/wechat/callback', data),
  me: () => api.get<User>('/auth/me'),
}
