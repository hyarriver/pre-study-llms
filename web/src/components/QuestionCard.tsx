/**
 * 单个题目卡片组件
 */
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Question, AnswerDetail } from '@/types'

interface QuestionCardProps {
  question: Question
  index: number
  selectedAnswer: string | string[] | undefined
  onAnswerChange: (questionId: number, answer: string | string[]) => void
  disabled?: boolean
  showResult?: boolean
  answerDetail?: AnswerDetail
}

export default function QuestionCard({
  question,
  index,
  selectedAnswer,
  onAnswerChange,
  disabled = false,
  showResult = false,
  answerDetail,
}: QuestionCardProps) {
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'single_choice':
        return '单选题'
      case 'multi_choice':
        return '多选题'
      case 'true_false':
        return '判断题'
      default:
        return '选择题'
    }
  }

  const handleOptionClick = (optionKey: string) => {
    if (disabled) return

    if (question.question_type === 'multi_choice') {
      // 多选题逻辑
      const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : []
      if (currentAnswers.includes(optionKey)) {
        onAnswerChange(
          question.id,
          currentAnswers.filter((a) => a !== optionKey)
        )
      } else {
        onAnswerChange(question.id, [...currentAnswers, optionKey])
      }
    } else {
      // 单选题和判断题
      onAnswerChange(question.id, optionKey)
    }
  }

  const isOptionSelected = (optionKey: string) => {
    if (Array.isArray(selectedAnswer)) {
      return selectedAnswer.includes(optionKey)
    }
    return selectedAnswer === optionKey
  }

  const getOptionStyle = (optionKey: string) => {
    if (!showResult) {
      return isOptionSelected(optionKey)
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50'
    }

    // 显示结果时的样式
    const isCorrect = answerDetail?.correct_answer
      .toLowerCase()
      .split(',')
      .includes(optionKey.toLowerCase())
    const isUserAnswer = answerDetail?.user_answer
      .toLowerCase()
      .split(',')
      .includes(optionKey.toLowerCase())

    if (isCorrect) {
      return 'border-green-500 bg-green-500/10'
    }
    if (isUserAnswer && !isCorrect) {
      return 'border-red-500 bg-red-500/10'
    }
    return 'border-border'
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        {/* 题目头部 */}
        <div className="flex items-start gap-3 mb-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
            {index}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {getQuestionTypeLabel(question.question_type)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({question.score}分)
              </span>
              {showResult && answerDetail && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    answerDetail.is_correct
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  )}
                >
                  {answerDetail.is_correct ? '正确' : '错误'}
                  {answerDetail.is_correct
                    ? ` +${answerDetail.earned_score}分`
                    : ' +0分'}
                </span>
              )}
            </div>
            <p className="text-base leading-relaxed">{question.content}</p>
          </div>
        </div>

        {/* 选项列表 */}
        <div className="space-y-2 ml-11">
          {question.options?.map((option) => (
            <div
              key={option.key}
              onClick={() => handleOptionClick(option.key)}
              className={cn(
                'p-3 rounded-lg border-2 transition-all cursor-pointer',
                getOptionStyle(option.key),
                disabled && !showResult && 'cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium',
                    isOptionSelected(option.key) || showResult
                      ? 'border-current'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {option.key}
                </span>
                <span className="flex-1">{option.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 答案解析（仅在显示结果时） */}
        {showResult && answerDetail?.explanation && (
          <div className="mt-4 ml-11 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">答案解析：</span>
              {answerDetail.explanation}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">正确答案：</span>
              {answerDetail.correct_answer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
