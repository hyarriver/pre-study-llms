import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { getApiErrorMessage } from '@/lib/utils'
import { checkBackendHealth } from '@/api/client'
import { authApi } from '@/api/auth'
import { BookOpen, Smartphone } from 'lucide-react'

function isWeChatBrowser() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /MicroMessenger/i.test(ua)
}

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const login = useAuthStore((s) => s.login)
  const wechatExchangeCode = useAuthStore((s) => s.wechatExchangeCode)
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search] = useSearchParams()
  const redirect = search.get('redirect') ?? '/chapters'
  const state = search.get('state') || '/chapters'
  const code = search.get('code')

  const wechat = isWeChatBrowser()

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
    const raw = phone.trim()
    if (!raw || !password) {
      setError('请填写手机号和密码')
      return
    }
    if (!/^\d{11}$/.test(raw)) {
      setError('请输入 11 位手机号')
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

  const handleWeChatLogin = useCallback(async () => {
    setError('')
    try {
      const { data } = await authApi.wechatAuthorize({ redirect })
      window.location.href = data.authorize_url
    } catch (err: unknown) {
      if (import.meta.env?.DEV) {
        const ax = err as { response?: { status?: number; data?: unknown } }
        console.error('[Login] 微信登录失败:', ax?.response?.status, ax?.response?.data, err)
      }
      setError(getApiErrorMessage(err, '微信登录失败，请重试'))
    }
  }, [redirect])

  // 微信回调：/login?code=...&state=...，用 code 换 token 后跳转
  useEffect(() => {
    if (!code) return
    wechatExchangeCode(code)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['chapters'] })
        await queryClient.invalidateQueries({ queryKey: ['chapter'] })
        navigate(state, { replace: true })
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, '微信登录失败，请重试'))
      })
  }, [code, wechatExchangeCode, queryClient, navigate, state])

  // 若在微信内置浏览器且未登录且无 code，则自动跳转微信授权
  useEffect(() => {
    if (user || !wechat || code) return
    const timer = setTimeout(() => {
      handleWeChatLogin().catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [user, wechat, code, handleWeChatLogin])

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
              uv run python -m uvicorn main:app --port 8001
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
          <CardDescription className="text-sm">使用手机号或微信登录，学习进度将自动云端同步</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4 flex-shrink-0" />
                手机号
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入 11 位手机号"
                autoComplete="tel"
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
                placeholder="请输入密码（首次输入即为注册密码）"
                autoComplete="current-password"
                disabled={isLoading}
                className="min-h-[44px] text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive break-words">{error}</p>}
            <Button type="submit" className="w-full min-h-[48px] text-base" disabled={isLoading}>
              {isLoading ? '处理中…' : '手机号登录 / 注册'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              首次使用时，输入手机号和密码将自动完成注册，无需单独注册按钮。
            </p>
          </form>

          <div className="relative">
            <div className="flex items-center my-4">
              <span className="flex-1 h-px bg-border" />
              <span className="px-2 text-xs text-muted-foreground">或</span>
              <span className="flex-1 h-px bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 min-h-[48px] text-base"
              disabled={isLoading || !wechat}
              onClick={handleWeChatLogin}
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                微信一键登录
              </span>
            </Button>
            {!wechat && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                请在微信中打开此页面使用微信登录。
              </p>
            )}
            {wechat && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                已检测到微信内置浏览器，系统会自动尝试微信登录。
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
