/**
 * 考试相关 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getQuestions,
  submitExam,
  getExamRecords,
  getBestRecord,
  getExamStatus,
} from '@/api/exam'
import type { ExamSubmission } from '@/types'

/**
 * 获取章节试题
 */
export function useQuestions(chapterId: number) {
  return useQuery({
    queryKey: ['questions', chapterId],
    queryFn: () => getQuestions(chapterId),
    enabled: chapterId > 0,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })
}

/**
 * 提交考试答案
 */
export function useSubmitExam(chapterId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (submission: ExamSubmission) => submitExam(chapterId, submission),
    onSuccess: () => {
      // 刷新相关数据
      queryClient.invalidateQueries({ queryKey: ['examRecords', chapterId] })
      queryClient.invalidateQueries({ queryKey: ['bestRecord', chapterId] })
      queryClient.invalidateQueries({ queryKey: ['examStatus', chapterId] })
      queryClient.invalidateQueries({ queryKey: ['progress', chapterId] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })
    },
  })
}

/**
 * 获取考试历史记录
 */
export function useExamRecords(chapterId: number) {
  return useQuery({
    queryKey: ['examRecords', chapterId],
    queryFn: () => getExamRecords(chapterId),
    enabled: chapterId > 0,
  })
}

/**
 * 获取最高分记录
 */
export function useBestRecord(chapterId: number) {
  return useQuery({
    queryKey: ['bestRecord', chapterId],
    queryFn: () => getBestRecord(chapterId),
    enabled: chapterId > 0,
  })
}

/**
 * 获取章节考试状态
 */
export function useExamStatus(chapterId: number) {
  return useQuery({
    queryKey: ['examStatus', chapterId],
    queryFn: () => getExamStatus(chapterId),
    enabled: chapterId > 0,
  })
}
