/**
 * README 查看器组件
 * 支持 Markdown 渲染与分页（内容过长时）
 */
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { createMarkdownComponents } from '@/components/MarkdownComponents'
import { splitMarkdownIntoPages } from '@/utils/splitMarkdown'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const LINES_PER_PAGE = 50

interface ReadmeViewerProps {
  content: string
  chapterNumber: number
}

export default function ReadmeViewer({ content, chapterNumber }: ReadmeViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const pages = splitMarkdownIntoPages(content, LINES_PER_PAGE)
  const totalPages = pages.length
  const showPagination = totalPages > 1
  const currentPageContent = pages[currentPage - 1] ?? ''

  useEffect(() => {
    setCurrentPage(1)
  }, [chapterNumber])

  const paginationBar = showPagination && (
    <div className="flex items-center justify-center gap-3 flex-wrap py-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </Button>
      <span className="text-sm text-muted-foreground">
        第 {currentPage}/{totalPages} 页
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}
        className="gap-1"
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <>
      {paginationBar}
      <div className="prose prose-invert max-w-none break-words overflow-wrap-anywhere">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={createMarkdownComponents({
            chapterNumber,
          })}
        >
          {currentPageContent}
        </ReactMarkdown>
      </div>
      {paginationBar}
    </>
  )
}
