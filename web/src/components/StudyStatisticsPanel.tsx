/**
 * 学习统计面板组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useStudyStatistics } from '@/hooks/useProgress'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Trophy,
  TrendingUp,
  LogIn,
} from 'lucide-react'

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

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

function StatCard({ icon, title, value, subtitle, className = '' }: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg bg-background/50 ${className}`}>
      <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

interface StudyStatisticsPanelProps {
  compact?: boolean
}

export default function StudyStatisticsPanel({ compact = false }: StudyStatisticsPanelProps) {
  const isAuth = !!useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useStudyStatistics()

  // 未登录时显示登录提示
  if (!isAuth) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            学习统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LogIn className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">登录后可查看学习统计</p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4 mr-2" />
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            学习统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  // 紧凑模式（用于首页）
  if (compact) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-400" />}
          title="学习进度"
          value={`${stats.overall_progress.toFixed(1)}%`}
          subtitle={`${stats.completed_chapters}/${stats.total_chapters} 章节`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
          title="已完成"
          value={`${stats.completed_chapters} 章`}
          subtitle={stats.in_progress_chapters > 0 ? `${stats.in_progress_chapters} 章学习中` : undefined}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-purple-400" />}
          title="学习时长"
          value={formatStudyTime(stats.total_study_time_seconds)}
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          title="连续学习"
          value={`${stats.current_streak} 天`}
          subtitle={stats.longest_streak > stats.current_streak ? `最长 ${stats.longest_streak} 天` : undefined}
        />
      </div>
    )
  }

  // 完整模式（用于章节列表页）
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          学习统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总体进度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-muted-foreground">
              {stats.completed_chapters}/{stats.total_chapters} 章节完成
            </span>
          </div>
          <Progress value={stats.overall_progress} className="h-3" />
          <p className="text-sm text-muted-foreground text-right">
            {stats.overall_progress.toFixed(1)}%
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
            title="已完成章节"
            value={stats.completed_chapters}
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-blue-400" />}
            title="学习中"
            value={stats.in_progress_chapters}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-purple-400" />}
            title="总学习时长"
            value={formatStudyTime(stats.total_study_time_seconds)}
          />
          <StatCard
            icon={<Flame className="h-5 w-5 text-orange-400" />}
            title="连续学习"
            value={`${stats.current_streak} 天`}
            subtitle={stats.longest_streak > 0 ? `最长 ${stats.longest_streak} 天` : undefined}
          />
        </div>

        {/* 成就提示 */}
        {stats.completed_chapters > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm">
              {stats.completed_chapters >= stats.total_chapters
                ? '🎉 恭喜你完成了所有章节的学习！'
                : stats.completed_chapters >= stats.total_chapters / 2
                ? '👏 已完成一半以上，继续加油！'
                : `📚 已完成 ${stats.completed_chapters} 个章节，继续保持！`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
