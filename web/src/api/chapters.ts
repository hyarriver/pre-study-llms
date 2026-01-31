/**
 * 章节相关 API
 */
import api from './client'
import type { Chapter, ChapterExamInfo } from '@/types'

export const chaptersApi = {
  getAll: () => api.get<Chapter[]>('/chapters/'),
  getById: (id: number) => api.get<Chapter>(`/chapters/${id}`),
  /** 章节考核信息（无需登录），用于未登录时决定是否显示考核 Tab */
  getExamInfo: (chapterId: number) =>
    api.get<ChapterExamInfo>(`/chapters/${chapterId}/exam-info`),
}
