/**
 * 学习进度相关 API
 */
import api from './client'
import type { Progress } from '@/types'

export const progressApi = {
  getByChapterId: (chapterId: number) => api.get<Progress>(`/progress/${chapterId}`),
  update: (chapterId: number, data: { completion_percentage?: number; completed?: boolean }) =>
    api.put<Progress>(`/progress/${chapterId}`, data),
  getAll: () => api.get<Progress[]>('/progress/'),
}
