/**
 * 类型定义
 */

// 用户与认证
export interface User {
  id: number
  username: string
  email: string
}

export interface Token {
  access_token: string
  token_type: string
}

// 章节类型
export interface Chapter {
  id: number
  chapter_number: number
  title: string
  description: string
  notebook_path: string
  readme_path: string
  pdf_path: string
  completion_percentage: number
  completed: boolean
  created_at: string
  updated_at: string
}

// 学习进度类型
export interface Progress {
  id: number
  chapter_id: number
  completion_percentage: number
  completed: boolean
  last_accessed: string
  study_time_seconds: number
}

// 章节进度详情
export interface ChapterProgressDetail {
  chapter_id: number
  chapter_number: number
  title: string
  completion_percentage: number
  completed: boolean
  study_time_seconds: number
  last_accessed: string | null
}

// 学习统计数据
export interface StudyStatistics {
  total_chapters: number
  completed_chapters: number
  in_progress_chapters: number
  overall_progress: number
  total_study_time_seconds: number
  current_streak: number
  longest_streak: number
  last_study_date: string | null
  chapter_details: ChapterProgressDetail[]
}

// 每日学习记录
export interface DailyStudyRecord {
  study_date: string
  study_time_seconds: number
  chapters_studied: number
}

// 学习热力图数据
export interface StudyHeatmapData {
  records: DailyStudyRecord[]
  start_date: string
  end_date: string
}

// 笔记类型
export interface Note {
  id: number
  chapter_id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

// Notebook Cell 类型
export interface NotebookCell {
  cell_type: 'code' | 'markdown'
  source: string
  metadata: Record<string, any>
  outputs?: Array<{
    output_type?: string
    data?: Record<string, any>
    text?: string | string[]
    execution_count?: number
  }>
}

// Notebook 内容类型
export interface NotebookContent {
  cells: NotebookCell[]
  metadata: Record<string, any>
  nbformat: number
  nbformat_minor: number
}
