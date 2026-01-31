/**
 * Notebook 相关 Hooks
 */
import { useQuery } from '@tanstack/react-query'
import { notebookApi } from '@/api/notebook'
import type { NotebookContent } from '@/types'

export const useNotebookContent = (chapterId: number, hasNotebook = true) => {
  return useQuery<NotebookContent>({
    queryKey: ['notebook', chapterId, 'content'],
    queryFn: async () => {
      const response = await notebookApi.getContent(chapterId)
      return response.data
    },
    enabled: !!chapterId && hasNotebook,
  })
}

export const useReadme = (chapterId: number, hasReadme = true) => {
  return useQuery<{ content: string }>({
    queryKey: ['notebook', chapterId, 'readme'],
    queryFn: async () => {
      const response = await notebookApi.getReadme(chapterId)
      return response.data
    },
    enabled: !!chapterId && hasReadme,
  })
}
