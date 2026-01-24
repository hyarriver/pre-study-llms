/**
 * 章节相关 API
 */
import api from './client'
import type { Chapter } from '@/types'

export const chaptersApi = {
  getAll: () => api.get<Chapter[]>('/chapters/'),
  getById: (id: number) => api.get<Chapter>(`/chapters/${id}`),
}
