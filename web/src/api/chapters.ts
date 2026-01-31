/**
 * 章节相关 API
 */
import api from './client'
import type { Chapter, ChapterExamInfo } from '@/types'

/** 管理员更新章节请求（均为可选） */
export interface ChapterUpdateBody {
  chapter_number?: number
  title?: string
  description?: string
  notebook_path?: string | null
  readme_path?: string | null
  pdf_path?: string | null
  docx_path?: string | null
}

export const chaptersApi = {
  getAll: () => api.get<Chapter[]>('/chapters/'),
  getById: (id: number) => api.get<Chapter>(`/chapters/${id}`),
  /** 章节考核信息（无需登录），用于未登录时决定是否显示考核 Tab */
  getExamInfo: (chapterId: number) =>
    api.get<ChapterExamInfo>(`/chapters/${chapterId}/exam-info`),
  /** 管理员：更新章节 */
  update: (id: number, body: ChapterUpdateBody) =>
    api.patch<Chapter>(`/chapters/${id}`, body),
  /** 管理员：按 ordered_ids 重排章节 */
  reorder: (orderedIds: number[]) =>
    api.put<{ message: string }>('/chapters/admin/reorder', { ordered_ids: orderedIds }),
  /** 管理员：删除章节 */
  delete: (id: number) =>
    api.delete<{ message: string }>(`/chapters/${id}`),
  /** 管理员：补生成 README、Notebook、考核题（仅用户提交章节） */
  regenerateContent: (chapterId: number) =>
    api.post<{ message: string }>(`/chapters/${chapterId}/regenerate-content`),
  /** 管理员：将章节 PDF 转为 Word（.docx） */
  convertToDocx: (chapterId: number) =>
    api.post<{ docx_path: string; already_exists?: boolean }>(`/chapters/${chapterId}/convert-to-docx`),
}
