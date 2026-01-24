/**
 * 章节状态管理
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Chapter } from '@/types'

interface ChapterState {
  chapters: Chapter[]
  currentChapter: Chapter | null
  loading: boolean
  error: string | null
  setChapters: (chapters: Chapter[]) => void
  setCurrentChapter: (chapter: Chapter | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChapterStore = create<ChapterState>()(
  devtools(
    (set) => ({
      chapters: [],
      currentChapter: null,
      loading: false,
      error: null,
      setChapters: (chapters) => set({ chapters }),
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'ChapterStore' }
  )
)
