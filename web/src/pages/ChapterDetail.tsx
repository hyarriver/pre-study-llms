import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useChapter } from '@/hooks/useChapters'
import { useNotebookContent, useReadme } from '@/hooks/useNotebook'
import { useUpdateProgress } from '@/hooks/useProgress'
import { useStudyTimer } from '@/hooks/useStudyTimer'
import { useAuthStore } from '@/store/authStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import NotebookViewer from '@/components/NotebookViewer'
import { createMarkdownComponents } from '@/components/MarkdownComponents'
import { ArrowLeft, CheckCircle2, LogIn, Clock, BookMarked, ClipboardList, Trophy } from 'lucide-react'
import ExamPanel from '@/components/ExamPanel'
import { useExamStatus } from '@/hooks/useExam'

export default function ChapterDetail() {
  const { id } = useParams<{ id: string }>()
  const chapterId = id ? parseInt(id) : 0
  const [activeTab, setActiveTab] = useState('notebook')
  const isAuth = !!useAuthStore((s) => s.user)
  const contentRef = useRef<HTMLDivElement>(null)
  const [readProgress, setReadProgress] = useState(0)  // 基于滚动的阅读进度
  
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId)
  const { data: notebookContent, isLoading: notebookLoading } = useNotebookContent(chapterId)
  const { data: readmeData, isLoading: readmeLoading } = useReadme(chapterId)
  const { data: examStatus } = useExamStatus(chapterId)
  const updateProgress = useUpdateProgress()

  // 学习时长追踪
  useStudyTimer({
    chapterId,
    enabled: isAuth && !!chapter,
    reportInterval: 30,  // 每30秒上报一次
  })

  // 监听滚动计算阅读进度（节流 + rAF，减轻滚动时的布局抖动）
  useEffect(() => {
    let raf = 0
    let last = 0
    const throttleMs = 120

    const handleScroll = () => {
      if (!contentRef.current) return
      const now = Date.now()
      if (raf) return
      if (now - last < throttleMs) return
      last = now
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = contentRef.current
        if (!el) return
        const docHeight = el.offsetHeight
        const winH = window.innerHeight
        const denom = docHeight - winH
        const pct = denom > 0
          ? Math.min(100, Math.round((window.scrollY / denom) * 100))
          : 0
        setReadProgress((prev) => (pct !== prev ? pct : prev))
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const handleProgressUpdate = async (percentage: number) => {
    if (!chapter || !isAuth) return
    try {
      await updateProgress.mutateAsync({
        chapterId: chapter.id,
        data: {
          completion_percentage: percentage,
          completed: percentage >= 100
        }
      })
    } catch (error) {
      console.error('更新进度失败:', error)
    }
  }

  // 根据滚动进度自动更新（仅当滚动进度大于当前进度时）
  useEffect(() => {
    if (!chapter || !isAuth || readProgress <= chapter.completion_percentage) return
    
    // 使用防抖，避免频繁更新
    const timer = setTimeout(() => {
      if (readProgress > chapter.completion_percentage) {
        handleProgressUpdate(readProgress)
      }
    }, 2000)  // 2秒防抖
    
    return () => clearTimeout(timer)
  }, [readProgress, chapter?.completion_percentage, chapter?.id, isAuth])

  if (chapterLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (!chapter) {
    return <div className="text-center py-12">章节不存在</div>
  }
  
  const readmeContent = readmeData?.content || ''

  return (
    <div className="space-y-4 sm:space-y-6" ref={contentRef}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" asChild size="sm" className="min-h-[44px]">
          <Link to="/chapters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">返回列表</span>
            <span className="sm:hidden">返回</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
            Chapter {chapter.chapter_number}: {chapter.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">{chapter.description}</p>
        </div>
        {chapter.completed && (
          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BookMarked className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            学习进度
          </CardTitle>
          {!isAuth && (
            <CardDescription className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              <Link to={`/login?redirect=${encodeURIComponent(`/chapters/${chapter.id}`)}`} className="text-primary hover:underline">
                登录以保存学习进度和时长
              </Link>
            </CardDescription>
          )}
          {isAuth && (
            <CardDescription className="flex items-center gap-2 text-green-600">
              <Clock className="h-4 w-4" />
              学习时长自动记录中...
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 综合进度条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">综合完成度</span>
                <span className="text-sm font-medium">
                  {Math.round(chapter.completion_percentage)}%
                </span>
              </div>
              <Progress value={chapter.completion_percentage} />
              <p className="text-xs text-muted-foreground">
                综合完成度 = 学习时长(50%) + 考核成绩(50%)
              </p>
            </div>

            {/* 分项进度 */}
            {isAuth && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium">学习时长</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    目标: 1小时 (占50%)
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-sm font-medium">考核成绩</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-primary">
                    {examStatus?.best_percentage?.toFixed(0) || 0}分
                  </p>
                  <p className="text-xs text-muted-foreground">
                    最高分 (占50%)
                  </p>
                </div>
              </div>
            )}

            {/* 当前阅读进度提示 */}
            {isAuth && readProgress > 0 && readProgress > chapter.completion_percentage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 text-sm text-blue-400">
                <Clock className="h-4 w-4" />
                当前阅读位置: {readProgress}%（进度将自动保存）
              </div>
            )}

            {/* 完成提示 */}
            {chapter.completed && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>恭喜！你已完成本章节的学习</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="notebook" className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">Notebook</TabsTrigger>
          <TabsTrigger value="readme" className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">README</TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-1 flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">
            <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">章节考核</span>
            <span className="sm:hidden">考核</span>
            {examStatus && examStatus.best_percentage > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
                {examStatus.best_percentage.toFixed(0)}分
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notebook" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Jupyter Notebook 内容</CardTitle>
            </CardHeader>
            <CardContent>
              {notebookLoading ? (
                <div className="text-center py-8">加载 Notebook 内容中...</div>
              ) : notebookContent ? (
                <NotebookViewer 
                  cells={notebookContent.cells} 
                  chapterNumber={chapter.chapter_number}
                />
              ) : (
                <p className="text-muted-foreground">
                  Notebook 内容加载失败或不存在
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readme" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>README</CardTitle>
            </CardHeader>
            <CardContent>
              {readmeLoading ? (
                <div className="text-center py-8">加载 README 内容中...</div>
              ) : readmeContent ? (
                <div className="prose prose-invert max-w-none break-words overflow-wrap-anywhere">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={createMarkdownComponents({
                      chapterNumber: chapter.chapter_number,
                    })}
                  >
                    {readmeContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">README 内容为空</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exam" className="mt-6">
          <ExamPanel chapterId={chapterId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
