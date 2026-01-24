/**
 * Notebook 查看器组件
 * 支持代码高亮、Markdown渲染和图片显示
 */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { NotebookCell } from '@/types'
import { detectLanguage } from '@/utils/detectLanguage'
import CodeBlock from '@/components/CodeBlock'
import { createMarkdownComponents } from '@/components/MarkdownComponents'

interface NotebookViewerProps {
  cells: NotebookCell[]
  chapterNumber: number
}

export default function NotebookViewer({ cells, chapterNumber }: NotebookViewerProps) {

  // 渲染代码输出（包括图片）
  const renderOutputs = (outputs: any[]) => {
    if (!outputs || outputs.length === 0) return null

    return (
      <div className="mt-2 space-y-2">
        {outputs.map((output, idx) => {
          // 处理图片输出
          if (output.data && output.data['image/png']) {
            const imageData = output.data['image/png']
            return (
              <img
                key={idx}
                src={`data:image/png;base64,${imageData}`}
                alt="Code output"
                className="max-w-full rounded border"
              />
            )
          }
          if (output.data && output.data['image/jpeg']) {
            const imageData = output.data['image/jpeg']
            return (
              <img
                key={idx}
                src={`data:image/jpeg;base64,${imageData}`}
                alt="Code output"
                className="max-w-full rounded border"
              />
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

  return (
    <div className="space-y-4">
      {cells.map((cell, index) => (
        <div
          key={index}
          className={`rounded-lg border overflow-hidden ${
            cell.cell_type === 'code'
              ? 'bg-muted/50'
              : 'bg-background'
          }`}
        >
          {cell.cell_type === 'markdown' ? (
            <div className="p-4">
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
                <div className="mt-4 px-4 pb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-2">输出:</div>
                  {renderOutputs(cell.outputs)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
