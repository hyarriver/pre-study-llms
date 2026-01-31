/**
 * Markdown 分页工具
 * 将过长 Markdown 按行数拆分为多页，提升阅读体验
 */

/**
 * 将 Markdown 文本按页拆分为若干块
 * - 尽量在语义边界切分：##、###、段落空行
 * - 不在代码块（```）内部切分
 * @param content 原始 Markdown 文本
 * @param linesPerPage 每页目标行数，默认 50
 * @returns 分页后的 Markdown 块数组
 */
export function splitMarkdownIntoPages(
  content: string,
  linesPerPage = 50
): string[] {
  if (!content?.trim()) return ['']

  // 统一换行符，避免 Windows \r\n 影响行数
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  // 若总行数不超过阈值，直接返回单页
  if (lines.length <= linesPerPage) {
    return [content]
  }

  // 1. 标记每行是否位于代码块内
  const inCodeBlock: boolean[] = []
  let insideBlock = false
  let blockFence = ''
  for (const line of lines) {
    const fence = /^(`{3,}|~{3,})/.exec(line)?.[1] ?? ''
    if (fence) {
      if (!insideBlock) {
        insideBlock = true
        blockFence = fence
      } else if (line.startsWith(blockFence)) {
        insideBlock = false
      }
    }
    inCodeBlock.push(insideBlock)
  }

  // 2. 找出可切分点：##、###、空行（段落边界），且不在代码块内
  const splitCandidates: number[] = [0]
  for (let i = 1; i < lines.length; i++) {
    if (inCodeBlock[i]) continue
    const line = lines[i]
    const isHeading = /^#{1,3}\s/.test(line) // 支持 #、##、###
    const isEmpty = line.trim() === ''
    if (isHeading || isEmpty) {
      splitCandidates.push(i)
    }
  }
  splitCandidates.push(lines.length)

  // 3. 按 linesPerPage 组合页面，在语义边界切分
  const pages: string[] = []
  let pageStart = 0

  while (pageStart < lines.length) {
    const remainingLines = lines.length - pageStart
    if (remainingLines <= linesPerPage) {
      pages.push(lines.slice(pageStart).join('\n'))
      break
    }

    const targetEnd = Math.min(pageStart + linesPerPage, lines.length)
    let bestSplit = targetEnd

    // 在 [pageStart, targetEnd] 区间找最大的切分点（优先在 ## / ### / 空行）
    for (let i = splitCandidates.length - 1; i >= 0; i--) {
      const cand = splitCandidates[i]
      if (cand > pageStart && cand <= targetEnd) {
        bestSplit = cand
        break
      }
    }

    pages.push(lines.slice(pageStart, bestSplit).join('\n'))
    pageStart = bestSplit
  }

  return pages.length > 0 ? pages : [content]
}
