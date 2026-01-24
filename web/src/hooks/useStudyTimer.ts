/**
 * 学习时长追踪 Hook
 * 自动追踪用户在章节页面的学习时长，并定期上报
 */
import { useEffect, useRef, useCallback } from 'react'
import { useUpdateProgress } from './useProgress'
import { useAuthStore } from '@/store/authStore'

interface UseStudyTimerOptions {
  chapterId: number
  enabled?: boolean
  reportInterval?: number  // 上报间隔（秒），默认60秒
}

export function useStudyTimer({ 
  chapterId, 
  enabled = true, 
  reportInterval = 60 
}: UseStudyTimerOptions) {
  const isAuth = !!useAuthStore((s) => s.user)
  const updateProgress = useUpdateProgress()
  
  // 累计的学习时长（秒）
  const accumulatedTimeRef = useRef(0)
  // 上次记录时间
  const lastTickRef = useRef<number | null>(null)
  // 页面是否可见
  const isVisibleRef = useRef(true)
  // 上报定时器
  const reportTimerRef = useRef<number | null>(null)

  // 上报学习时长
  const reportStudyTime = useCallback(() => {
    if (!isAuth || !enabled || accumulatedTimeRef.current <= 0) return
    
    const timeToReport = accumulatedTimeRef.current
    accumulatedTimeRef.current = 0  // 重置累计时间
    
    updateProgress.mutate({
      chapterId,
      data: {
        study_time_seconds: timeToReport,
      },
    })
  }, [chapterId, isAuth, enabled, updateProgress])

  // 更新累计时间
  const tick = useCallback(() => {
    if (!isVisibleRef.current || !enabled) return
    
    const now = Date.now()
    if (lastTickRef.current !== null) {
      const elapsed = Math.floor((now - lastTickRef.current) / 1000)
      if (elapsed > 0 && elapsed < 5) {  // 防止异常大的时间差
        accumulatedTimeRef.current += elapsed
      }
    }
    lastTickRef.current = now
  }, [enabled])

  // 处理页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      isVisibleRef.current = isVisible
      
      if (isVisible) {
        // 页面变为可见，重置计时起点
        lastTickRef.current = Date.now()
      } else {
        // 页面变为不可见，上报当前累计时间
        tick()  // 先计算一次
        reportStudyTime()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [tick, reportStudyTime])

  // 设置定时器
  useEffect(() => {
    if (!isAuth || !enabled) return

    // 初始化计时起点
    lastTickRef.current = Date.now()

    // 每秒更新累计时间
    const tickInterval = setInterval(tick, 1000)

    // 定期上报
    reportTimerRef.current = window.setInterval(() => {
      reportStudyTime()
    }, reportInterval * 1000)

    return () => {
      clearInterval(tickInterval)
      if (reportTimerRef.current) {
        clearInterval(reportTimerRef.current)
      }
      // 组件卸载时上报剩余时间
      if (accumulatedTimeRef.current > 0) {
        const timeToReport = accumulatedTimeRef.current
        updateProgress.mutate({
          chapterId,
          data: {
            study_time_seconds: timeToReport,
          },
        })
      }
    }
  }, [chapterId, isAuth, enabled, reportInterval, tick, reportStudyTime, updateProgress])

  // 手动上报（供外部调用）
  const forceReport = useCallback(() => {
    tick()
    reportStudyTime()
  }, [tick, reportStudyTime])

  return {
    forceReport,
    currentSessionTime: accumulatedTimeRef.current,
  }
}
