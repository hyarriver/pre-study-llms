/**
 * 学习进度相关 API
 */
import api from './client'
import type { Progress, StudyStatistics, StudyHeatmapData } from '@/types'

export interface ProgressUpdateData {
  completion_percentage?: number
  completed?: boolean
  study_time_seconds?: number
}

export const progressApi = {
  getByChapterId: (chapterId: number) => api.get<Progress>(`/progress/${chapterId}`),
  update: (chapterId: number, data: ProgressUpdateData) =>
    api.put<Progress>(`/progress/${chapterId}`, data),
  getAll: () => api.get<Progress[]>('/progress/'),
  getStatistics: () => api.get<StudyStatistics>('/progress/statistics'),
  getHeatmap: (days: number = 365) => api.get<StudyHeatmapData>(`/progress/heatmap?days=${days}`),
}
