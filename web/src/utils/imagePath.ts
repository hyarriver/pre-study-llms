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
  
  // 如果是绝对URL或base64，直接返回
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src
  }
  
  // 如果是相对路径，转换为静态资源路径
  // 移除开头的 ./ 或 ../
  let cleanPath = src.replace(/^\.\.?\//, '')
  
  // 构建完整的静态资源路径
  // 静态文件挂载在 /static，指向 documents 目录
  // 所以 chapter1/assets/0.png 应该访问 /static/chapter1/assets/0.png
  return `/static/chapter${chapterNumber}/${cleanPath}`
}
