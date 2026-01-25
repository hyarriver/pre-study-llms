import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { getApiErrorMessage } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !email.trim() || !password) {
      setError('请填写用户名、邮箱和密码')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    try {
      await register(username.trim(), email.trim(), password)
      await queryClient.invalidateQueries({ queryKey: ['chapters'] })
      await queryClient.invalidateQueries({ queryKey: ['chapter'] })
      navigate('/chapters', { replace: true })
    } catch (err: unknown) {
      if (import.meta.env?.DEV) {
        const ax = err as { response?: { status?: number; data?: unknown } }
        console.error('[Register] 失败:', ax?.response?.status, ax?.response?.data, err)
      }
      setError(getApiErrorMessage(err, '注册失败，请重试'))
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">注册</CardTitle>
          <CardDescription className="text-sm">注册后即可保存与同步学习进度</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                disabled={isLoading}
                className="min-h-[44px] text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                autoComplete="email"
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
                placeholder="至少 6 位"
                autoComplete="new-password"
                disabled={isLoading}
                className="min-h-[44px] text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive break-words">{error}</p>}
            <Button type="submit" className="w-full min-h-[48px] text-base" disabled={isLoading}>
              {isLoading ? '注册中…' : '注册'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              去登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
