/**
 * 代码块组件
 * 支持代码高亮、复制、语言检测等功能
 */
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  title?: string
  canCollapse?: boolean
  defaultCollapsed?: boolean
}

export default function CodeBlock({
  code,
  language = 'python',
  showLineNumbers = true,
  title,
  canCollapse = false,
  defaultCollapsed = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 使用 VS Code Dark Plus 主题
  const theme = vscDarkPlus

  return (
    <div className="relative group rounded-lg border overflow-hidden bg-[#1e1e1e] my-3 sm:my-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#252526] border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {title && (
            <span className="text-xs font-mono text-gray-400 truncate">{title}</span>
          )}
          {language && language !== 'text' && (
            <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded bg-[#3e3e42] text-gray-300 font-mono flex-shrink-0">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {canCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 sm:h-8 sm:w-8 text-gray-400 hover:text-gray-200 active:text-gray-200 touch-manipulation p-0"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? '展开代码' : '折叠代码'}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-8 sm:w-8 text-gray-400 hover:text-gray-200 active:text-gray-200 touch-manipulation p-0"
            onClick={handleCopy}
            title="复制代码"
            aria-label="复制代码"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 代码内容 */}
      {!collapsed && (
        <div className="relative overflow-x-auto -webkit-overflow-scrolling-touch touch-pan-x">
          <SyntaxHighlighter
            language={language}
            style={theme}
            customStyle={{
              margin: 0,
              padding: '0.75rem',
              fontSize: '0.7rem',
              lineHeight: '1.6',
              background: 'transparent',
            }}
            showLineNumbers={showLineNumbers}
            lineNumberStyle={{
              minWidth: '2em',
              paddingRight: '0.5rem',
              color: '#858585',
              userSelect: 'none',
            }}
            wrapLines={false}
            wrapLongLines={true}
            PreTag="div"
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}

      {collapsed && (
        <div className="px-3 sm:px-4 py-2 text-xs text-gray-400">
          代码已折叠（{code.split('\n').length} 行）
        </div>
      )}
    </div>
  )
}
