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
import { ArrowLeft, CheckCircle2, LogIn, Clock, BookMarked } from 'lucide-react'

/**
 * 格式化学习时长
 */
function formatStudyTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${remainingMinutes}分钟`
}

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
  const updateProgress = useUpdateProgress()

  // 学习时长追踪
  useStudyTimer({
    chapterId,
    enabled: isAuth && !!chapter,
    reportInterval: 30,  // 每30秒上报一次
  })

  // 监听滚动计算阅读进度
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return
      
      const element = contentRef.current
      const scrollTop = window.scrollY
      const docHeight = element.offsetHeight
      const windowHeight = window.innerHeight
      const scrollPercent = Math.min(
        100,
        Math.round((scrollTop / (docHeight - windowHeight)) * 100)
      )
      setReadProgress(Math.max(0, scrollPercent))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
    <div className="space-y-6" ref={contentRef}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/chapters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Chapter {chapter.chapter_number}: {chapter.title}
          </h1>
          <p className="text-muted-foreground mt-2">{chapter.description}</p>
        </div>
        {chapter.completed && (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
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
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">完成度</span>
                <span className="text-sm font-medium">
                  {Math.round(chapter.completion_percentage)}%
                </span>
              </div>
              <Progress value={chapter.completion_percentage} />
            </div>

            {/* 当前阅读进度提示 */}
            {isAuth && readProgress > 0 && readProgress > chapter.completion_percentage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 text-sm text-blue-400">
                <Clock className="h-4 w-4" />
                当前阅读位置: {readProgress}%（进度将自动保存）
              </div>
            )}

            {/* 快速设置进度按钮 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">快速设置进度：</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={chapter.completion_percentage >= 25 ? "default" : "outline"}
                  onClick={() => handleProgressUpdate(25)}
                  disabled={!isAuth || updateProgress.isPending}
                >
                  25%
                </Button>
                <Button
                  size="sm"
                  variant={chapter.completion_percentage >= 50 ? "default" : "outline"}
                  onClick={() => handleProgressUpdate(50)}
                  disabled={!isAuth || updateProgress.isPending}
                >
                  50%
                </Button>
                <Button
                  size="sm"
                  variant={chapter.completion_percentage >= 75 ? "default" : "outline"}
                  onClick={() => handleProgressUpdate(75)}
                  disabled={!isAuth || updateProgress.isPending}
                >
                  75%
                </Button>
                <Button
                  size="sm"
                  variant={chapter.completed ? "default" : "outline"}
                  onClick={() => handleProgressUpdate(100)}
                  disabled={!isAuth || updateProgress.isPending}
                  className={chapter.completed ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {chapter.completed ? "✓ 已完成" : "标记完成"}
                </Button>
              </div>
            </div>

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
        <TabsList>
          <TabsTrigger value="notebook">Notebook</TabsTrigger>
          <TabsTrigger value="readme">README</TabsTrigger>
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
                <div>
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
      </Tabs>
    </div>
  )
}
