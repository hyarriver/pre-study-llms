import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useChapters } from '@/hooks/useChapters'
import { CheckCircle2, Circle, BookOpen } from 'lucide-react'
import StudyStatisticsPanel from '@/components/StudyStatisticsPanel'

export default function ChapterList() {
  const { data: chapters = [], isLoading, error } = useChapters()

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">加载失败，请稍后重试</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">教程列表</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          选择您想要学习的章节开始学习
        </p>
      </div>

      {/* 学习统计面板 */}
      <StudyStatisticsPanel />

      <div className="grid gap-3 sm:gap-4">
        {chapters.map((chapter) => (
          <Card key={chapter.id} className="hover:shadow-lg transition-shadow active:scale-[0.98] touch-manipulation">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-base sm:text-lg break-words">
                      Chapter {chapter.chapter_number}: {chapter.title}
                    </CardTitle>
                    {chapter.completed ? (
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="text-sm sm:text-base break-words">
                    {chapter.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">学习进度</span>
                    <span className="text-xs sm:text-sm font-medium">
                      {Math.round(chapter.completion_percentage)}%
                    </span>
                  </div>
                  <Progress value={chapter.completion_percentage} className="h-2" />
                </div>
                <Button asChild className="w-full sm:w-auto min-h-[44px] touch-manipulation">
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
