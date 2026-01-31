/**
 * 图片模态框组件
 * 用于点击图片后放大显示
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageModalProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  // 确保只在客户端渲染 Portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // 处理打开/关闭动画
  useEffect(() => {
    if (isOpen) {
      // 打开时：立即渲染，然后触发动画
      setShouldRender(true)
      // 使用 requestAnimationFrame 确保 DOM 更新后再触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 动画通过 isOpen 状态控制
        })
      })
    } else {
      // 关闭时：等待动画完成后再移除 DOM
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 250) // 略长于动画时长，确保动画完成
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!shouldRender || !mounted) return null

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg transition-opacity duration-200 ease-in-out",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 text-white transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="关闭"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* 图片容器 */}
      <div
        className={cn(
          "relative max-w-[95vw] max-h-[95vh] flex items-center justify-center transition-all duration-200 ease-out",
          isOpen ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
        style={{
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-in-out'
        }}
      >
        <img
          src={src}
          alt={alt || '放大图片'}
          className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl select-none"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
          onError={(e) => {
            console.error('Image load error in modal:', src)
            e.currentTarget.style.border = '2px dashed red'
          }}
        />
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
