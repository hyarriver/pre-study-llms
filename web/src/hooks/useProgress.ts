/**
 * 学习进度相关 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi, type ProgressUpdateData } from '@/api/progress'
import type { Progress, StudyStatistics, StudyHeatmapData } from '@/types'
import { useAuthStore } from '@/store/authStore'

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
    mutationFn: async ({ chapterId, data }: { chapterId: number; data: ProgressUpdateData }) => {
      const response = await progressApi.update(chapterId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      // 更新缓存
      queryClient.invalidateQueries({ queryKey: ['progress', variables.chapterId] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      queryClient.invalidateQueries({ queryKey: ['chapter', variables.chapterId] })
      queryClient.invalidateQueries({ queryKey: ['study-statistics'] })
    },
  })
}

export const useStudyStatistics = () => {
  const isAuth = !!useAuthStore((s) => s.user)
  
  return useQuery<StudyStatistics>({
    queryKey: ['study-statistics'],
    queryFn: async () => {
      const response = await progressApi.getStatistics()
      return response.data
    },
    enabled: isAuth,
    staleTime: 30000, // 30秒内不重新请求
  })
}

export const useStudyHeatmap = (days: number = 365) => {
  const isAuth = !!useAuthStore((s) => s.user)
  
  return useQuery<StudyHeatmapData>({
    queryKey: ['study-heatmap', days],
    queryFn: async () => {
      const response = await progressApi.getHeatmap(days)
      return response.data
    },
    enabled: isAuth,
    staleTime: 60000, // 1分钟内不重新请求
  })
}
