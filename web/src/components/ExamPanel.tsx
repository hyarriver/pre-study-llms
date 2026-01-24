/**
 * 考试面板组件
 */
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ClipboardList,
  PlayCircle,
  Trophy,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  History,
} from 'lucide-react'
import { useQuestions, useSubmitExam, useExamStatus, useExamRecords } from '@/hooks/useExam'
import { useAuthStore } from '@/store/authStore'
import QuestionCard from './QuestionCard'
import ExamResult from './ExamResult'
import type { ExamResult as ExamResultType, ExamSubmission } from '@/types'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface ExamPanelProps {
  chapterId: number
}

type ExamState = 'idle' | 'taking' | 'result'

export default function ExamPanel({ chapterId }: ExamPanelProps) {
  const isAuth = !!useAuthStore((s) => s.user)
  const [examState, setExamState] = useState<ExamState>('idle')
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [examResult, setExamResult] = useState<ExamResultType | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const { data: questions, isLoading: questionsLoading } = useQuestions(chapterId)
  const { data: examStatus, isLoading: statusLoading } = useExamStatus(chapterId)
  const { data: examRecords } = useExamRecords(chapterId)
  const submitExam = useSubmitExam(chapterId)

  const handleStartExam = () => {
    setAnswers({})
    setExamResult(null)
    setExamState('taking')
  }

  const handleAnswerChange = (questionId: number, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmitExam = async () => {
    if (!questions) return

    const submission: ExamSubmission = { answers }

    try {
      const result = await submitExam.mutateAsync(submission)
      setExamResult(result)
      setExamState('result')
    } catch (error) {
      console.error('提交考试失败:', error)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setExamResult(null)
    setExamState('taking')
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions?.length || 0
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  // 未登录提示
  if (!isAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            章节考核
          </CardTitle>
          <CardDescription>登录后可参加章节考核测试</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">请先登录以参加考核</p>
            <Button asChild>
              <Link to={`/login?redirect=${encodeURIComponent(`/chapters/${chapterId}`)}`}>
                去登录
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 加载中
  if (questionsLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>加载考试信息中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 没有试题
  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            章节考核
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">本章节暂无考核试题</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 显示考试结果
  if (examState === 'result' && examResult) {
    return (
      <ExamResult
        result={examResult}
        questions={questions}
        onRetry={handleRetry}
      />
    )
  }

  // 正在考试
  if (examState === 'taking') {
    return (
      <div className="space-y-4">
        {/* 考试进度条 */}
        <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                答题进度: {answeredCount}/{totalQuestions}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* 题目列表 */}
        {questions.map((question, idx) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={idx + 1}
            selectedAnswer={answers[question.id]}
            onAnswerChange={handleAnswerChange}
          />
        ))}

        {/* 提交按钮 */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {answeredCount < totalQuestions
                  ? `还有 ${totalQuestions - answeredCount} 题未作答`
                  : '所有题目已作答'}
              </p>
              <Button
                onClick={handleSubmitExam}
                disabled={submitExam.isPending}
                size="lg"
              >
                {submitExam.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    提交答案
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 考试首页（idle状态）
  return (
    <div className="space-y-4">
      {/* 考试信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            章节考核
          </CardTitle>
          <CardDescription>
            完成考核测试，检验学习成果
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 考试信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{examStatus?.question_count || 0}</p>
              <p className="text-sm text-muted-foreground">题目数量</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{examStatus?.total_score || 0}</p>
              <p className="text-sm text-muted-foreground">满分</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-2xl font-bold text-primary">
                {examStatus?.best_percentage.toFixed(0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">最高分</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{examStatus?.attempts || 0}</p>
              <p className="text-sm text-muted-foreground">考试次数</p>
            </div>
          </div>

          {/* 最高分展示 */}
          {examStatus && examStatus.attempts > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="font-medium">
                  历史最高分: {examStatus.best_percentage.toFixed(1)}分
                </p>
                <p className="text-sm text-muted-foreground">
                  共参加 {examStatus.attempts} 次考试
                </p>
              </div>
            </div>
          )}

          {/* 考试规则 */}
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-2">考试说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 本次考核共 {examStatus?.question_count || 0} 道题目</li>
              <li>• 题型包括：单选题、多选题、判断题</li>
              <li>• 可多次参加考试，系统记录最高成绩</li>
              <li>• 考核成绩占学习进度的 50%</li>
            </ul>
          </div>

          {/* 开始考试按钮 */}
          <Button onClick={handleStartExam} size="lg" className="w-full">
            <PlayCircle className="h-5 w-5 mr-2" />
            开始考试
          </Button>
        </CardContent>
      </Card>

      {/* 历史记录 */}
      {examRecords && examRecords.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                考试历史记录
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {showHistory ? '收起' : '展开'}
              </span>
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="space-y-2">
                {examRecords.map((record, idx) => (
                  <div
                    key={record.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      idx === 0 ? 'bg-primary/10' : 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {idx === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <div>
                        <p className="font-medium">
                          {record.percentage.toFixed(1)}分
                          <span className="text-sm text-muted-foreground ml-2">
                            ({record.correct_count}/{record.total_count} 正确)
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-sm font-medium',
                        record.percentage >= 60 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {record.percentage >= 60 ? '通过' : '未通过'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
