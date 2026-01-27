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
  const cleanPath = src.replace(/^\.\.?\//, '')
  // 使用 /api/v1/static，仅需网关代理 /api 即可，无需单独配置 /static
  const path = `/api/v1/static/chapter${chapterNumber}/${cleanPath}`
  const base = import.meta.env.VITE_STATIC_BASE
  return base ? `${base.replace(/\/$/, '')}${path}` : path
}
