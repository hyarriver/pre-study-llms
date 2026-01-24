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
    if (e.response) console.error('API Error:', e.response.data)
    return Promise.reject(e)
  }
)

export default api
