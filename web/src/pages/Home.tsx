import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BookOpen, ArrowRight, Sparkles, Code, Brain, Zap, Shield, Cpu, Layers, Bot, Lock } from 'lucide-react'
import NeuralNetworkBackground from '@/components/NeuralNetworkBackground'
import StudyStatisticsPanel from '@/components/StudyStatisticsPanel'
import { useAuthStore } from '@/store/authStore'
import { useStudyStatistics } from '@/hooks/useProgress'
import { useChapters } from '@/hooks/useChapters'

const CHAPTER_ICONS = [
  Cpu, Zap, Layers, Brain, Shield, Lock, Code, Sparkles, Bot, Shield, Lock,
]
function getChapterIcon(index: number) {
  return CHAPTER_ICONS[index % CHAPTER_ICONS.length]
}

function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}小时` : `${hours}小时${rem}分钟`
}

export default function Home() {
  const isAuth = !!useAuthStore((s) => s.user)
  const { data: stats } = useStudyStatistics()
  const { data: chapters = [], isLoading: chaptersLoading } = useChapters()
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Three.js 背景 */}
      <NeuralNetworkBackground />
      
      {/* 渐变遮罩层 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/80 z-10" />
      
      {/* 顶部光效 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-blue-500/20 via-purple-500/10 to-transparent blur-3xl z-[5]" />
      
      {/* 内容层 */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero 区域 */}
        <div className="text-center pt-12 sm:pt-20 pb-12 sm:pb-16 space-y-6 sm:space-y-8 px-2">
          {/* 标签 */}
          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card text-xs sm:text-sm text-blue-400">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-pulse" />
            <span className="hidden sm:inline">个人学习记录 · 上海交通大学《动手学大模型》</span>
            <span className="sm:hidden">个人学习记录 · 动手学大模型</span>
          </div>
          
          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight px-2">
            <span className="gradient-text animate-gradient">动手学大模型</span>
          </h1>
          
          {/* 副标题 */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground/70 max-w-3xl mx-auto leading-relaxed px-4">
            记录
            <span className="text-blue-400 font-semibold"> 学习进度 </span>·
            <span className="text-purple-400 font-semibold"> 章节考核 </span>·
            <span className="text-cyan-400 font-semibold"> 笔记复习 </span>
            ，系统掌握大模型核心
          </p>
          
          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4 px-4">
            <Button asChild size="lg" className="glow-button text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 rounded-xl border-0 min-h-[48px] w-full sm:w-auto touch-manipulation">
              <Link to="/chapters">
                开始学习
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 rounded-xl min-h-[48px] w-full sm:w-auto touch-manipulation">
              <a href="https://github.com/hyarriver/pre-study-llms" target="_blank" rel="noopener noreferrer">
                GitHub
                <Code className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
          </div>
          
          {/* 统计数据：已登录显示个人进度，未登录显示概览 */}
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-12 pt-4 sm:pt-6 md:pt-8 flex-wrap px-4">
            {isAuth && stats ? (
              <>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    {stats.completed_chapters}/{stats.total_chapters}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">已学章节</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    {formatStudyTime(stats.total_study_time_seconds)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">累计学习</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    {Math.round(stats.overall_progress)}%
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">总进度</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    {chapters.length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">章节教程</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">100%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">开源免费</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">实战</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">代码驱动</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 特性卡片 */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3 py-6 sm:py-8 md:py-12 px-4">
          <div className="feature-card p-4 sm:p-6 hover:scale-105 transition-all duration-300 active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex-shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">学习进度</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              每章完成度与学习时长自动记录，总进度与章节考核成绩一目了然
            </p>
          </div>

          <div className="feature-card p-4 sm:p-6 hover:scale-105 transition-all duration-300 active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex-shrink-0">
                <Code className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">章节考核</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              每章配套单选/判断题，成绩计入进度；支持从 PDF/README 生成题目
            </p>
          </div>

          <div className="feature-card p-4 sm:p-6 hover:scale-105 transition-all duration-300 active:scale-[0.98] touch-manipulation">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex-shrink-0">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">Notebook + PDF</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              在线阅读 Notebook 与 README，每章 PDF 可下载或在线打开
            </p>
          </div>
        </div>

        {/* 学习统计（仅登录用户显示） */}
        {isAuth && (
          <div className="py-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="gradient-text">我的学习</span>
              </h2>
              <p className="text-muted-foreground text-lg">追踪你的学习进度</p>
            </div>
            <StudyStatisticsPanel compact />
          </div>
        )}

        {/* 章节列表 */}
        <div className="py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">课程大纲</span>
            </h2>
            <p className="text-muted-foreground text-lg">从基础到进阶，系统掌握大模型核心技术</p>
          </div>
          
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4">
            {chaptersLoading ? (
              <p className="col-span-full text-center text-muted-foreground text-sm py-8">加载中...</p>
            ) : chapters.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground text-sm py-8">暂无章节</p>
            ) : (
              chapters.map((chapter) => {
                const Icon = getChapterIcon(chapter.chapter_number - 1)
                const numStr = String(chapter.chapter_number).padStart(2, '0')
                return (
                  <Link
                    key={chapter.id}
                    to={`/chapters/${chapter.id}`}
                    className="group glass-card rounded-xl p-3 sm:p-4 md:p-5 hover:scale-105 active:scale-[0.98] transition-all duration-300 touch-manipulation min-h-[100px] sm:min-h-[120px]"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-300" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono text-blue-400/70">Chapter {numStr}</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-blue-300 transition-colors truncate">
                          {chapter.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {chapter.description ?? ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* 底部 CTA */}
        <div className="py-12 sm:py-16 text-center px-4">
          <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-12 max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 gradient-text">开始我的学习记录</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              记录进度、完成章节考核，系统掌握大模型核心
            </p>
            <Button asChild size="lg" className="glow-button text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 rounded-xl border-0 min-h-[48px] w-full sm:w-auto touch-manipulation">
              <Link to="/chapters">
                进入章节
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
