/**
 * 考试相关 API
 */
import api from './client'
import type {
  Question,
  ExamSubmission,
  ExamResult,
  ExamRecord,
  ChapterExamStatus,
} from '@/types'

/**
 * 获取章节试题列表
 */
export const getQuestions = async (chapterId: number): Promise<Question[]> => {
  const response = await api.get(`/exam/${chapterId}/questions`)
  return response.data
}

/**
 * 提交考试答案
 */
export const submitExam = async (
  chapterId: number,
  submission: ExamSubmission
): Promise<ExamResult> => {
  const response = await api.post(`/exam/${chapterId}/submit`, submission)
  return response.data
}

/**
 * 获取考试历史记录
 */
export const getExamRecords = async (chapterId: number): Promise<ExamRecord[]> => {
  const response = await api.get(`/exam/${chapterId}/records`)
  return response.data
}

/**
 * 获取最高分记录
 */
export const getBestRecord = async (chapterId: number): Promise<ExamRecord | null> => {
  const response = await api.get(`/exam/${chapterId}/best`)
  return response.data
}

/**
 * 获取章节考试状态
 */
export const getExamStatus = async (chapterId: number): Promise<ChapterExamStatus> => {
  const response = await api.get(`/exam/${chapterId}/status`)
  return response.data
}
