/**
 * 学习进度相关 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi } from '@/api/progress'
import type { Progress } from '@/types'

export const useProgress = (chapterId: number) => {
  return useQuery<Progress>({
    queryKey: ['progress', chapterId],
    queryFn: async () => {
      const response = await progressApi.getByChapterId(chapterId)
      return response.data
    },
    enabled: !!chapterId,
  })
}

export const useUpdateProgress = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ chapterId, data }: { chapterId: number; data: { completion_percentage?: number; completed?: boolean } }) => {
      const response = await progressApi.update(chapterId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      // 更新缓存
      queryClient.invalidateQueries({ queryKey: ['progress', variables.chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      queryClient.invalidateQueries({ queryKey: ['chapter', variables.chapterId] })
    },
  })
}
