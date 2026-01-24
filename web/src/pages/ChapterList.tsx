import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useChapters } from '@/hooks/useChapters'
import { CheckCircle2, Circle, BookOpen } from 'lucide-react'

export default function ChapterList() {
  const { data: chapters = [], isLoading, error } = useChapters()

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">加载失败，请稍后重试</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">教程列表</h1>
        <p className="text-muted-foreground">
          选择您想要学习的章节开始学习
        </p>
      </div>

      <div className="grid gap-4">
        {chapters.map((chapter) => (
          <Card key={chapter.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle>
                      Chapter {chapter.chapter_number}: {chapter.title}
                    </CardTitle>
                    {chapter.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription className="text-base">
                    {chapter.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">学习进度</span>
                    <span className="text-sm font-medium">
                      {Math.round(chapter.completion_percentage)}%
                    </span>
                  </div>
                  <Progress value={chapter.completion_percentage} />
                </div>
                <Button asChild>
                  <Link to={`/chapters/${chapter.id}`}>
                    开始学习
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
