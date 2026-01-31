import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ArrowLeft, CheckCircle2, LogIn, Clock, BookMarked, ClipboardList, Trophy, FileText, Download, ExternalLink, FileDown } from 'lucide-react'
import ExamPanel from '@/components/ExamPanel'
import { useExamStatus, useChapterExamInfo } from '@/hooks/useExam'
import { notebookApi } from '@/api/notebook'
import { chaptersApi } from '@/api/chapters'

export default function ChapterDetail() {
  const { id } = useParams<{ id: string }>()
  const chapterId = id ? parseInt(id) : 0
  const [activeTab, setActiveTab] = useState('notebook')
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuth = !!user
  const isAdmin = user?.role === 'admin'
  const contentRef = useRef<HTMLDivElement>(null)
  const [readProgress, setReadProgress] = useState(0)  // 基于滚动的阅读进度
  
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId)
  const hasNotebook = !!chapter?.notebook_path
  const hasReadme = !!chapter?.readme_path
  const { data: notebookContent, isLoading: notebookLoading } = useNotebookContent(chapterId, hasNotebook)
  const { data: readmeData, isLoading: readmeLoading } = useReadme(chapterId, hasReadme)
  const { data: examStatus } = useExamStatus(chapterId, { enabled: isAuth })
  const { data: examInfo } = useChapterExamInfo(chapterId, { enabled: !isAuth })
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

  const hasDocument = !!chapter?.pdf_path
  const validTabs = [
    hasNotebook && 'notebook',
    hasReadme && 'readme',
    hasDocument && 'pdf',
    'exam',  // 始终包含，无题时由 ExamPanel 显示空状态
  ].filter(Boolean) as string[]

  // 文档学习型章节默认显示文档标签；确保 activeTab 对应存在的标签（须在 return 前，保持 hooks 顺序）
  useEffect(() => {
    if (!chapter || validTabs.length === 0) return
    const currentValid = validTabs.includes(activeTab)
    if (!currentValid) {
      setActiveTab(validTabs[0])
    }
  }, [chapter?.id, validTabs.join(','), activeTab])

  if (chapterLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <Skeleton className="h-9 w-20 rounded-md" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!chapter) {
    return <div className="text-center py-12">章节不存在</div>
  }
  
  const readmeContent = readmeData?.content || ''
  const isDocx = chapter.pdf_path?.toLowerCase().endsWith('.docx')

  const docMimeType = isDocx
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf'
  const docExt = isDocx ? '.docx' : '.pdf'

  const handlePdfDownload = async () => {
    try {
      const { data } = await notebookApi.getPdf(chapter.id)
      const url = URL.createObjectURL(new Blob([data], { type: docMimeType }))
      const a = document.createElement('a')
      a.href = url
      a.download = chapter.pdf_path?.split('/').pop() || `chapter-${chapter.chapter_number}${docExt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('下载文档失败:', e)
    }
  }

  const handlePdfOpen = async () => {
    try {
      const { data } = await notebookApi.getPdf(chapter.id)
      const url = URL.createObjectURL(new Blob([data], { type: docMimeType }))
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      console.error('打开文档失败:', e)
    }
  }

  const hasDocx = !!chapter.docx_path
  const convertToDocxMutation = useMutation({
    mutationFn: () => chaptersApi.convertToDocx(chapter.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })
    },
  })
  const handleConvertToDocx = () => {
    convertToDocxMutation.mutate()
  }
  const handleDocxDownload = async () => {
    try {
      const { data } = await notebookApi.getDocx(chapter.id)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      const a = document.createElement('a')
      a.href = url
      a.download = chapter.docx_path?.split('/').pop() || `chapter-${chapter.chapter_number}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('下载 Word 失败:', e)
    }
  }

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

            {/* 当前阅读进度提示（固定定位，避免随滚动出现/消失时造成整页布局抖动） */}
            {isAuth && readProgress > 0 && readProgress > chapter.completion_percentage && (
              <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-sm text-blue-400 shadow-lg border border-blue-500/20 max-w-[calc(100vw-2rem)]">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>阅读 {readProgress}%（自动保存）</span>
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
          {hasNotebook && (
            <TabsTrigger value="notebook" className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">Notebook</TabsTrigger>
          )}
          {hasReadme && (
            <TabsTrigger value="readme" className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">README</TabsTrigger>
          )}
          {hasDocument && (
            <TabsTrigger value="pdf" className="flex items-center gap-1 flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base touch-manipulation">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{isDocx ? '文档' : 'PDF'}</span>
            </TabsTrigger>
          )}
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

        {hasNotebook && (
        <TabsContent value="notebook" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Jupyter Notebook 内容</CardTitle>
            </CardHeader>
            <CardContent>
              {notebookLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-32 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
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
        )}

        {hasReadme && (
        <TabsContent value="readme" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>README</CardTitle>
            </CardHeader>
            <CardContent>
              {readmeLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-32 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
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
        )}

        {hasDocument && (
          <TabsContent value="pdf" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  {isDocx ? '本章文档' : '本章 PDF'}
                </CardTitle>
                <CardDescription>
                  {isDocx ? '下载或在新窗口中打开本章 DOCX 文档' : '下载或在新窗口中打开本章讲义 PDF'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={handlePdfDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isDocx ? '下载文档' : '下载 PDF'}
                </Button>
                {hasDocx && (
                  <Button variant="secondary" onClick={handleDocxDownload} className="gap-2">
                    <FileDown className="h-4 w-4" />
                    下载 Word
                  </Button>
                )}
                {!hasDocx && chapter.pdf_path?.toLowerCase().endsWith('.pdf') && isAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleConvertToDocx}
                    disabled={convertToDocxMutation.isPending}
                    className="gap-2"
                  >
                    {convertToDocxMutation.isPending ? '转换中...' : '转为 Word'}
                  </Button>
                )}
                <Button variant="outline" onClick={handlePdfOpen} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  在新窗口打开
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="exam" className="mt-6">
          <ExamPanel chapterId={chapterId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
