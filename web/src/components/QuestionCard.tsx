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
      case 'fill_blank':
        return '填空题'
      case 'short_answer':
        return '简答题'
      default:
        return '选择题'
    }
  }

  const isChoiceType = ['single_choice', 'multi_choice', 'true_false'].includes(question.question_type)

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
    <Card className="mb-3 sm:mb-4">
      <CardContent className="pt-4 sm:pt-6">
        {/* 题目头部 */}
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm sm:text-base">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
              <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {getQuestionTypeLabel(question.question_type)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({question.score}分)
              </span>
              {showResult && answerDetail && (
                <span
                  className={cn(
                    'text-xs px-1.5 sm:px-2 py-0.5 rounded',
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
            <p className="text-sm sm:text-base leading-relaxed break-words">{question.content}</p>
          </div>
        </div>

        {/* 选项列表（选择题/判断题）或输入框（填空/简答） */}
        <div className="space-y-2 ml-9 sm:ml-11">
          {isChoiceType && question.options?.map((option) => (
            <div
              key={option.key}
              onClick={() => handleOptionClick(option.key)}
              className={cn(
                'p-2.5 sm:p-3 rounded-lg border-2 transition-all cursor-pointer touch-manipulation min-h-[44px] active:scale-[0.98]',
                getOptionStyle(option.key),
                disabled && !showResult && 'cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0',
                    isOptionSelected(option.key) || showResult
                      ? 'border-current'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {option.key}
                </span>
                <span className="flex-1 text-sm sm:text-base break-words">{option.value}</span>
              </div>
            </div>
          ))}
          {(question.question_type === 'fill_blank' || question.question_type === 'short_answer') && (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[80px] sm:min-h-[100px] p-3 rounded-lg border-2 border-input bg-background text-sm sm:text-base resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={question.question_type === 'fill_blank' ? '请填写答案（多空用 | 或逗号分隔）' : '请简要作答'}
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={(e) => !disabled && onAnswerChange(question.id, e.target.value)}
                disabled={disabled}
                rows={question.question_type === 'short_answer' ? 3 : 2}
              />
              {showResult && answerDetail && (
                <p className="text-xs text-muted-foreground">
                  你的答案：{answerDetail.user_answer || '（未填）'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 答案解析（仅在显示结果时） */}
        {showResult && answerDetail?.explanation && (
          <div className="mt-3 sm:mt-4 ml-9 sm:ml-11 p-2.5 sm:p-3 rounded-lg bg-muted/50">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">答案解析：</span>
              {answerDetail.explanation}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              <span className="font-medium text-foreground">正确答案：</span>
              {answerDetail.correct_answer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
