/**
 * Markdown 组件配置
 * 用于统一配置 ReactMarkdown 的自定义组件
 */
import { useState, useEffect } from 'react'
import type { Components } from 'react-markdown'
import CodeBlock from './CodeBlock'
import { processImagePath } from '@/utils/imagePath'
import ImageModal from './ImageModal'

interface MarkdownComponentsProps {
  chapterNumber?: number
}

// 图片组件（带点击放大、固定宽高比防滚动抖动、占位、失败时尝试 /static 备用）
function ImageWithModal({ src, alt, chapterNumber, ...props }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)

  const imageSrc = processImagePath(src || '', chapterNumber)
  const cleanPath = (src || '').replace(/^\.\.?\//, '').replace(/^\/+/, '')
  // 优先 /api/v1/static（与网关只代理 /api 的部署一致），失败再试 /static/
  const primarySrc = imageSrc
  const fallbackSrc = imageSrc.startsWith('http') ? '' : (cleanPath ? `/static/chapter${chapterNumber}/${cleanPath}` : '')
  const [currentSrc, setCurrentSrc] = useState(primarySrc)

  useEffect(() => {
    setCurrentSrc(imageSrc)
    setError(false)
    setTriedFallback(false)
  }, [imageSrc])

  if (!imageSrc) return <span className="block my-4 text-muted-foreground text-sm">[图片路径无效]</span>

  const handleError = () => {
    if (!triedFallback && fallbackSrc) {
      setTriedFallback(true)
      setCurrentSrc(fallbackSrc)
      setError(false)
    } else {
      setError(true)
    }
  }

  const displaySrc = currentSrc || imageSrc

  return (
    <>
      <div className="relative my-4 w-full overflow-hidden rounded-lg border shadow-sm bg-muted/20" style={{ aspectRatio: '16/9' }}>
        {!error && (
          <img
            {...props}
            src={displaySrc}
            alt={alt ?? ''}
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity touch-manipulation rounded-lg"
            loading="lazy"
            onClick={() => setIsModalOpen(true)}
            onError={handleError}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
            <span>图片加载失败</span>
            <span className="text-xs break-all max-w-full">{displaySrc}</span>
            <span className="text-xs">请确认后端已启动（默认 8000 端口）且 /api、/static 已代理到后端</span>
          </div>
        )}
      </div>
      <ImageModal
        src={displaySrc}
        alt={alt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export function createMarkdownComponents({
  chapterNumber = 1,
}: MarkdownComponentsProps = {}): Components {
  return {
    // 表格
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto">
        <table
          {...props}
          className="min-w-full divide-y divide-border border border-border rounded-lg overflow-hidden"
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead {...props} className="bg-muted">
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody {...props} className="divide-y divide-border bg-background">
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr
        {...props}
        className="hover:bg-muted/50 transition-colors"
      >
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th
        {...props}
        className="px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        {...props}
        className="px-4 py-3 text-sm text-foreground"
      >
        {children}
      </td>
    ),

    // 代码块
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeString = String(children).replace(/\n$/, '')

      return !inline && language ? (
        <CodeBlock
          code={codeString}
          language={language}
          showLineNumbers={codeString.split('\n').length > 5}
        />
      ) : (
        <code
          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
          {...props}
        >
          {children}
        </code>
      )
    },

    // 图片（使用带模态框的组件）
    img: (props) => <ImageWithModal {...props} chapterNumber={chapterNumber} />,

    // 标题
    h1: ({ children, ...props }) => (
      <h1
        {...props}
        className="text-3xl font-bold mt-8 mb-4 text-foreground border-b pb-2"
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        {...props}
        className="text-2xl font-bold mt-6 mb-3 text-foreground border-b pb-2"
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        {...props}
        className="text-xl font-semibold mt-5 mb-2 text-foreground"
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        {...props}
        className="text-lg font-semibold mt-4 mb-2 text-foreground"
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5
        {...props}
        className="text-base font-semibold mt-3 mb-2 text-foreground"
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6
        {...props}
        className="text-sm font-semibold mt-3 mb-2 text-foreground"
      >
        {children}
      </h6>
    ),

    // 段落
    p: ({ children, ...props }) => (
      <p {...props} className="my-4 leading-7 text-foreground">
        {children}
      </p>
    ),

    // 列表
    ul: ({ children, ...props }) => (
      <ul
        {...props}
        className="my-4 ml-6 list-disc space-y-2 text-foreground"
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        {...props}
        className="my-4 ml-6 list-decimal space-y-2 text-foreground"
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} className="leading-7">
        {children}
      </li>
    ),

    // 引用
    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        className="my-4 border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r"
      >
        {children}
      </blockquote>
    ),

    // 链接
    a: ({ children, href, ...props }) => (
      <a
        {...props}
        href={href}
        className="text-primary hover:underline underline-offset-4 break-words break-all overflow-wrap-anywhere inline-block max-w-full"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
      >
        {children}
      </a>
    ),

    // 水平线
    hr: ({ ...props }) => (
      <hr
        {...props}
        className="my-6 border-t border-border"
      />
    ),

    // 强调
    strong: ({ children, ...props }) => (
      <strong {...props} className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em {...props} className="italic text-foreground">
        {children}
      </em>
    ),

    // 删除线
    del: ({ children, ...props }) => (
      <del {...props} className="line-through text-muted-foreground">
        {children}
      </del>
    ),

    // 行内代码
    // 已在 code 组件中处理

    // 换行
    br: ({ ...props }) => <br {...props} className="block my-2" />,
  }
}
