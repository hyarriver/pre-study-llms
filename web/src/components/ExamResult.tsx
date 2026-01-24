/**
 * 考试结果组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Trophy, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import QuestionCard from './QuestionCard'
import type { ExamResult as ExamResultType, Question } from '@/types'
import { cn } from '@/lib/utils'

interface ExamResultProps {
  result: ExamResultType
  questions: Question[]
  onRetry: () => void
}

export default function ExamResult({ result, questions, onRetry }: ExamResultProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getScoreLevel = () => {
    if (result.percentage >= 90) return { label: '优秀', color: 'text-green-500' }
    if (result.percentage >= 80) return { label: '良好', color: 'text-blue-500' }
    if (result.percentage >= 60) return { label: '及格', color: 'text-yellow-500' }
    return { label: '需加强', color: 'text-red-500' }
  }

  const scoreLevel = getScoreLevel()

  return (
    <div className="space-y-6">
      {/* 成绩总览卡片 */}
      <Card className="overflow-hidden">
        <div className={cn(
          'h-2',
          result.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'
        )} />
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            {result.is_best && (
              <Trophy className="h-6 w-6 text-yellow-500" />
            )}
            考试完成
            {result.is_best && (
              <span className="text-sm font-normal text-yellow-500">
                (新纪录!)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {/* 分数显示 */}
          <div className="space-y-2">
            <div className="text-6xl font-bold">
              <span className={scoreLevel.color}>{result.percentage}</span>
              <span className="text-2xl text-muted-foreground">分</span>
            </div>
            <p className={cn('text-lg font-medium', scoreLevel.color)}>
              {scoreLevel.label}
            </p>
          </div>

          {/* 进度条 */}
          <div className="max-w-md mx-auto space-y-2">
            <Progress value={result.percentage} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>得分: {result.score}</span>
              <span>满分: {result.total_score}</span>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{result.total_count}</p>
              <p className="text-sm text-muted-foreground">总题数</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-500">
                {result.correct_count}
              </p>
              <p className="text-sm text-muted-foreground">答对</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-2xl font-bold text-red-500">
                {result.total_count - result.correct_count}
              </p>
              <p className="text-sm text-muted-foreground">答错</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <Button onClick={onRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              重新考试
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  收起详情
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  查看详情
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 答题详情 */}
      {showDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            答题详情
            <span className="text-sm font-normal text-muted-foreground">
              ({result.correct_count}/{result.total_count} 正确)
            </span>
          </h3>

          {/* 快速导航 */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50">
            {result.details.map((detail, idx) => (
              <div
                key={detail.question_id}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  detail.is_correct
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                )}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {/* 题目列表 */}
          {questions.map((question, idx) => {
            const detail = result.details.find(
              (d) => d.question_id === question.id
            )
            return (
              <QuestionCard
                key={question.id}
                question={question}
                index={idx + 1}
                selectedAnswer={detail?.user_answer}
                onAnswerChange={() => {}}
                disabled
                showResult
                answerDetail={detail}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
