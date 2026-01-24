/**
 * 章节相关 Hooks
 */
import { useQuery } from '@tanstack/react-query'
import { chaptersApi } from '@/api/chapters'
import type { Chapter } from '@/types'

export const useChapters = () => {
  return useQuery<Chapter[]>({
    queryKey: ['chapters'],
    queryFn: async () => {
      const response = await chaptersApi.getAll()
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5分钟
  })
}

export const useChapter = (id: number) => {
  return useQuery<Chapter>({
    queryKey: ['chapter', id],
    queryFn: async () => {
      const response = await chaptersApi.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}
