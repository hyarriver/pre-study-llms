import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { getApiErrorMessage } from '@/lib/utils'
import { checkBackendHealth } from '@/api/client'
import { BookOpen, User } from 'lucide-react'

export default function Login() {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search] = useSearchParams()
  const redirect = search.get('redirect') ?? '/chapters'

  const probeBackend = useCallback(async () => {
    setBackendOnline(null)
    const ok = await checkBackendHealth()
    setBackendOnline(ok)
    return ok
  }, [])

  useEffect(() => {
    probeBackend()
  }, [probeBackend])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const raw = nickname.trim()
    if (!raw || !password) {
      setError('请填写昵称和密码')
      return
    }
    if (raw.length < 2 || raw.length > 20) {
      setError('昵称长度为 2～20 个字符')
      return
    }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-]+$/.test(raw)) {
      setError('昵称仅支持中文、字母、数字、下划线和短横线')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    try {
      await login(raw, password)
      await queryClient.invalidateQueries({ queryKey: ['chapters'] })
      await queryClient.invalidateQueries({ queryKey: ['chapter'] })
      navigate(redirect, { replace: true })
    } catch (err: unknown) {
      if (import.meta.env?.DEV) {
        const ax = err as { response?: { status?: number; data?: unknown } }
        console.error('[Login] 失败:', ax?.response?.status, ax?.response?.data, err)
      }
      setError(getApiErrorMessage(err, '登录/注册失败，请重试'))
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 sm:space-y-6 pt-6 sm:pt-12 px-4">
      <div className="flex justify-center">
        <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
          动手学大模型
        </Link>
      </div>

      {backendOnline === false && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">后端未连接</p>
          <p className="mt-1 text-muted-foreground">
            请先在 <code className="rounded bg-muted px-1">backend</code> 目录运行：
            <br />
            <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs">
              uv run python -m uvicorn main:app --port 8000
            </code>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => probeBackend()}
          >
            重新检测连接
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">登录 / 注册</CardTitle>
          <CardDescription className="text-sm">
            使用昵称和密码登录，学习进度将自动云端同步。昵称唯一，首次填写即完成注册。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                昵称
              </label>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="2～20 字符，中文、字母、数字、下划线、短横线"
                autoComplete="username"
                disabled={isLoading}
                className="min-h-[44px] text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位（首次输入即为注册密码）"
                autoComplete="current-password"
                disabled={isLoading}
                className="min-h-[44px] text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive break-words">{error}</p>}
            <Button type="submit" className="w-full min-h-[48px] text-base" disabled={isLoading}>
              {isLoading ? '处理中…' : '昵称登录 / 注册'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              昵称不可与现有用户重复，注册时会自动校验。
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
