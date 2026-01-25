/**
 * API 客户端配置
 */
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (e) => Promise.reject(e)
)

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) useAuthStore.getState().logout()
    if (e.response && import.meta.env?.DEV)
      console.error('API Error:', e.response.status, e.response.data)
    return Promise.reject(e)
  }
)

export default api

/** 检查后端是否可达（走代理 /api/health） */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { method: 'GET' })
    return r.ok
  } catch {
    return false
  }
}
