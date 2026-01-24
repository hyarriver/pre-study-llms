/**
 * 笔记相关 API
 */
import api from './client'
import type { Note } from '@/types'

export const notesApi = {
  getByChapterId: (chapterId: number) => api.get<Note[]>(`/notes/chapter/${chapterId}`),
  create: (data: { chapter_id: number; title: string; content: string }) =>
    api.post<Note>('/notes/', data),
  update: (noteId: number, data: { title?: string; content?: string }) =>
    api.put<Note>(`/notes/${noteId}`, data),
  delete: (noteId: number) => api.delete(`/notes/${noteId}`),
}
