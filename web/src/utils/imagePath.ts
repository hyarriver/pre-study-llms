/**
 * 图片路径处理工具
 */

/**
 * 处理图片路径，转换为静态资源路径
 * @param src 原始图片路径
 * @param chapterNumber 章节编号
 * @returns 处理后的图片路径
 */
export function processImagePath(src: string, chapterNumber: number): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src
  }
  const cleanPath = src.replace(/^\.\.?\//, '').replace(/^\/+/, '')
  if (!cleanPath) return ''
  const path = `/api/v1/static/chapter${chapterNumber}/${cleanPath}`
  const base = import.meta.env.VITE_STATIC_BASE
  if (base) return `${String(base).replace(/\/$/, '')}${path}`
  // 若 API 与前端不同域且已配置 VITE_API_BASE_URL，用其 origin 作为图片根
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase && /^https?:\/\//i.test(String(apiBase))) {
    try {
      return `${new URL(apiBase).origin}${path}`
    } catch { /* ignore */ }
  }
  return path
}
