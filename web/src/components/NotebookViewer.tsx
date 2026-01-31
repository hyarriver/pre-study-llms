/**
 * Notebook 查看器组件
 * 支持代码高亮、Markdown渲染和图片显示
 */
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { NotebookCell } from '@/types'
import { detectLanguage } from '@/utils/detectLanguage'
import CodeBlock from '@/components/CodeBlock'
import { createMarkdownComponents } from '@/components/MarkdownComponents'
import ImageModal from '@/components/ImageModal'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 12

interface NotebookViewerProps {
  cells: NotebookCell[]
  chapterNumber: number
}

export default function NotebookViewer({ cells: rawCells, chapterNumber }: NotebookViewerProps) {
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 防御：API 可能返回 undefined 或非数组，统一为数组
  const cells = Array.isArray(rawCells) ? rawCells : []

  const totalPages = Math.max(1, Math.ceil(cells.length / PAGE_SIZE))
  const visibleCells = cells.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const totalCells = cells.length

  useEffect(() => {
    setCurrentPage(1)
  }, [chapterNumber])

  // 渲染代码输出（包括图片）
  const renderOutputs = (outputs: any[]) => {
    if (!outputs || outputs.length === 0) return null

    return (
      <div className="mt-2 space-y-2">
        {outputs.map((output, idx) => {
          // 处理图片输出
          if (output.data && output.data['image/png']) {
            const imageData = output.data['image/png']
            const imageSrc = `data:image/png;base64,${imageData}`
            return (
              <div key={idx} className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <img
                  src={imageSrc}
                  alt="Code output"
                  className="max-w-full h-auto rounded border block cursor-pointer hover:opacity-90 transition-opacity touch-manipulation"
                  loading="lazy"
                  onClick={() => setModalImage({ src: imageSrc, alt: 'Code output' })}
                />
              </div>
            )
          }
          if (output.data && output.data['image/jpeg']) {
            const imageData = output.data['image/jpeg']
            const imageSrc = `data:image/jpeg;base64,${imageData}`
            return (
              <div key={idx} className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <img
                  src={imageSrc}
                  alt="Code output"
                  className="max-w-full h-auto rounded border block cursor-pointer hover:opacity-90 transition-opacity touch-manipulation"
                  loading="lazy"
                  onClick={() => setModalImage({ src: imageSrc, alt: 'Code output' })}
                />
              </div>
            )
          }
          // 处理文本输出
          if (output.output_type === 'stream' || output.output_type === 'display_data') {
            const text = output.text || output.data?.['text/plain'] || ''
            if (text) {
              const textContent = Array.isArray(text) ? text.join('') : text
              return (
                <CodeBlock
                  key={idx}
                  code={textContent}
                  language="text"
                  showLineNumbers={false}
                  title="输出"
                />
              )
            }
          }
          // 处理执行结果
          if (output.output_type === 'execute_result') {
            const data = output.data || {}
            if (data['text/plain']) {
              const textContent = Array.isArray(data['text/plain']) 
                ? data['text/plain'].join('') 
                : data['text/plain']
              return (
                <CodeBlock
                  key={idx}
                  code={textContent}
                  language="text"
                  showLineNumbers={false}
                  title="执行结果"
                />
              )
            }
          }
          return null
        })}
      </div>
    )
  }

  // 分页栏始终显示，便于用户看到分页功能（0 节时也显示「第 1/1 页，共 0 节」）
  const paginationBar = (
    <div
      role="navigation"
      aria-label="Notebook 分页"
      className="flex items-center justify-center gap-3 flex-wrap py-3 px-4 rounded-xl bg-muted/70 border-2 border-border shadow-md"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        className="gap-1 shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </Button>
      <span className="text-sm font-semibold text-foreground min-w-[10rem] text-center tabular-nums">
        第 {currentPage} / {totalPages} 页，共 {totalCells} 节
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}
        className="gap-1 shrink-0"
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <>
      {/* 顶部分页：打开即见，无需滚到底 */}
      {paginationBar}

      <div className="space-y-3 sm:space-y-4 mt-4">
        {visibleCells.map((cell, idx) => {
          const index = (currentPage - 1) * PAGE_SIZE + idx
          return (
        <div
          key={index}
          className={`rounded-lg border overflow-hidden ${
            cell.cell_type === 'code'
              ? 'bg-muted/50'
              : 'bg-background'
          }`}
        >
          {cell.cell_type === 'markdown' ? (
            <div className="p-3 sm:p-4 prose prose-invert max-w-none break-words overflow-wrap-anywhere">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={createMarkdownComponents({ chapterNumber })}
              >
                {cell.source}
              </ReactMarkdown>
            </div>
          ) : (
            <div>
              <CodeBlock
                code={cell.source}
                language={detectLanguage(cell.source, cell.metadata)}
                showLineNumbers={true}
                title="代码"
                canCollapse={cell.source.split('\n').length > 20}
              />
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="mt-3 sm:mt-4 px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-2">输出:</div>
                  {renderOutputs(cell.outputs)}
                </div>
              )}
            </div>
          )}
        </div>
        )
        })}
      </div>

      {/* 底部分页栏：与顶部样式一致，更醒目 */}
      {paginationBar}

      {/* 图片模态框 */}
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
        />
      )}
    </>
  )
}
