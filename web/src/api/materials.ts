/**
 * 材料提交相关 API
 */
import api from './client'
import type { MaterialSubmission, MaterialSubmissionWithUser } from '@/types'

export const materialsApi = {
  submit: (formData: FormData) =>
    api.post<MaterialSubmission>('/materials/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMySubmissions: () => api.get<MaterialSubmission[]>('/materials/my-submissions'),
  deleteMySubmission: (submissionId: number) =>
    api.delete<{ message: string }>(`/materials/my-submissions/${submissionId}`),
  getPendingSubmissions: () => api.get<MaterialSubmissionWithUser[]>('/materials/admin/pending'),
  getAllSubmissions: () => api.get<MaterialSubmissionWithUser[]>('/materials/admin/all'),
  adminDelete: (submissionId: number) =>
    api.delete<{ message: string }>(`/materials/admin/${submissionId}`),
  approve: (submissionId: number) =>
    api.post<{ message: string; chapter_id: number }>(`/materials/admin/${submissionId}/approve`),
  reject: (submissionId: number, reason?: string) =>
    api.post<{ message: string }>(`/materials/admin/${submissionId}/reject`, { reason }),
  getPreview: (submissionId: number) =>
    api.get(`/materials/admin/${submissionId}/preview`, { responseType: 'blob' }),
}
