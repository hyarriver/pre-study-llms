import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { BookOpen, Smartphone } from 'lucide-react'

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod/i.test(ua) || window.innerWidth < 768
}

function isWeChatBrowser() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /MicroMessenger/i.test(ua)
}

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const loginWithWeChat = useAuthStore((s) => s.loginWithWeChat)
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search] = useSearchParams()
  const redirect = search.get('redirect') ?? '/chapters'

  const mobile = isMobileDevice()
  const wechat = isWeChatBrowser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim() || !password) {
      setError('请填写手机号和密码')
      return
    }
    try {
      await login(phone.trim(), password)
      await queryClient.invalidateQueries({ queryKey: ['chapters'] })
      await queryClient.invalidateQueries({ queryKey: ['chapter'] })
      navigate(redirect, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : '登录/注册失败，请重试')
    }
  }

  const handleWeChatLogin = async () => {
    setError('')
    try {
      // 本地生成一个稳定的 mock openid，模拟微信登录
      const key = 'mock_wechat_openid'
      let openid = localStorage.getItem(key)
      if (!openid) {
        openid = `mock_${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem(key, openid)
      }
      await loginWithWeChat(openid)
      await queryClient.invalidateQueries({ queryKey: ['chapters'] })
      await queryClient.invalidateQueries({ queryKey: ['chapter'] })
      navigate(redirect, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : '微信登录失败，请重试')
    }
  }

  // 若在手机端且微信内置浏览器，且未登录，则尝试自动触发一次微信登录
  useEffect(() => {
    if (user || !mobile || !wechat) return
    // 避免页面刚加载时的闪烁，稍微延迟
    const timer = setTimeout(() => {
      handleWeChatLogin().catch(() => {
        // 静默失败，留在当前页由用户手动点击
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [user, mobile, wechat])

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-12">
      <div className="flex justify-center">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <BookOpen className="h-6 w-6" />
          动手学大模型
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>登录 / 注册</CardTitle>
          <CardDescription>使用手机号或微信登录，学习进度将自动云端同步</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                手机号
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入 11 位手机号"
                autoComplete="tel"
                disabled={isLoading}
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
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
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
              className="w-full flex items-center justify-center gap-2"
              disabled={isLoading}
              onClick={handleWeChatLogin}
            >
              <span className="inline-flex items-center gap-2">
                {/* 用简单图标文字替代缺失的 WechatLogo 图标 */}
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                微信一键登录（模拟）
              </span>
            </Button>
            {mobile && wechat && (
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
