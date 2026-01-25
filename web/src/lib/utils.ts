import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 从 API 异常中解析错误信息，兼容 FastAPI 422 校验错误（detail 为数组）及网络错误 */
export function getApiErrorMessage(
  err: unknown,
  fallback = '操作失败，请重试'
): string {
  const ax = err as {
    response?: { data?: unknown; status?: number }
    message?: string
    code?: string
  }
  const data = ax?.response?.data as Record<string, unknown> | string | undefined
  const detail = data && typeof data === 'object' && 'detail' in data ? (data as { detail?: unknown }).detail : undefined

  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; message?: string }
    const msg = first?.msg ?? first?.message
    if (typeof msg === 'string') return msg
  }

  // 无 response：多为网络错误、后端未启动
  if (!ax?.response) {
    const m = ax?.message ?? ''
    if (/network|failed|fetch|加载|refused|econnrefused/i.test(m) || ax?.code === 'ERR_NETWORK')
      return '网络连接失败：请先启动后端（在 backend 目录运行：uv run python -m uvicorn main:app --port 8001）'
    if (import.meta.env?.DEV) console.error('[getApiErrorMessage] 无 response:', err)
    return fallback
  }

  const status = ax.response?.status
  if (status === 500) {
    if (typeof detail === 'string') return detail
    if (typeof data === 'string') return '服务器内部错误，请稍后重试'
    return '服务器内部错误，请稍后重试'
  }
  if (import.meta.env?.DEV) console.error('[getApiErrorMessage] 未解析:', { status, data }, err)
  return fallback
}
