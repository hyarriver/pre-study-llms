/**
 * Notebook 相关 API
 */
import api from './client'
import type { NotebookContent } from '@/types'

export const notebookApi = {
  getContent: (chapterId: number) => api.get<NotebookContent>(`/notebook/${chapterId}/content`),
  getReadme: (chapterId: number) => api.get<{ content: string }>(`/notebook/${chapterId}/readme`),
  getPdf: (chapterId: number) => api.get(`/notebook/${chapterId}/pdf`, { responseType: 'blob' }),
  /** 获取章节 Word 文档（.docx），仅当已转换出 DOCX 时可用 */
  getDocx: (chapterId: number) => api.get(`/notebook/${chapterId}/docx`, { responseType: 'blob' }),
}
