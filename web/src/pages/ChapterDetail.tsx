import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useChapter } from '@/hooks/useChapters'
import { useNotebookContent, useReadme } from '@/hooks/useNotebook'
import { useUpdateProgress } from '@/hooks/useProgress'
import { useAuthStore } from '@/store/authStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import NotebookViewer from '@/components/NotebookViewer'
import { createMarkdownComponents } from '@/components/MarkdownComponents'
import { ArrowLeft, CheckCircle2, LogIn } from 'lucide-react'

export default function ChapterDetail() {
  const { id } = useParams<{ id: string }>()
  const chapterId = id ? parseInt(id) : 0
  const [activeTab, setActiveTab] = useState('notebook')
  const isAuth = !!useAuthStore((s) => s.user)
  
  const { data: chapter, isLoading: chapterLoading } = useChapter(chapterId)
  const { data: notebookContent, isLoading: notebookLoading } = useNotebookContent(chapterId)
  const { data: readmeData, isLoading: readmeLoading } = useReadme(chapterId)
  const updateProgress = useUpdateProgress()

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

  if (chapterLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (!chapter) {
    return <div className="text-center py-12">章节不存在</div>
  }
  
  const readmeContent = readmeData?.content || ''

  return (
    <div className="space-y-6">
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
          <CardTitle>学习进度</CardTitle>
          {!isAuth && (
            <CardDescription className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              <Link to={`/login?redirect=${encodeURIComponent(`/chapters/${chapter.id}`)}`} className="text-primary hover:underline">
                登录以保存学习进度
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">完成度</span>
              <span className="text-sm font-medium">
                {Math.round(chapter.completion_percentage)}%
              </span>
            </div>
            <Progress value={chapter.completion_percentage} />
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProgressUpdate(25)}
                disabled={!isAuth}
              >
                25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProgressUpdate(50)}
                disabled={!isAuth}
              >
                50%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProgressUpdate(75)}
                disabled={!isAuth}
              >
                75%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProgressUpdate(100)}
                disabled={!isAuth}
              >
                完成
              </Button>
            </div>
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
