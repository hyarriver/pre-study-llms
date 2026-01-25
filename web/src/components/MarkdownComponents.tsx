/**
 * Markdown 组件配置
 * 用于统一配置 ReactMarkdown 的自定义组件
 */
import { useState } from 'react'
import type { Components } from 'react-markdown'
import CodeBlock from './CodeBlock'
import { processImagePath } from '@/utils/imagePath'
import ImageModal from './ImageModal'

interface MarkdownComponentsProps {
  chapterNumber?: number
}

// 图片组件（带点击放大功能）
function ImageWithModal({ src, alt, chapterNumber, ...props }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const imageSrc = processImagePath(src || '', chapterNumber)

  return (
    <>
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className="max-w-full h-auto rounded-lg border shadow-sm my-4 cursor-pointer hover:opacity-90 transition-opacity touch-manipulation"
        loading="lazy"
        onClick={() => setIsModalOpen(true)}
        onError={(e) => {
          console.error('Image load error:', {
            original: src,
            processed: imageSrc,
            chapter: chapterNumber,
          })
          e.currentTarget.style.border = '2px dashed red'
          e.currentTarget.title = `无法加载图片: ${src}`
        }}
      />
      <ImageModal
        src={imageSrc}
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
