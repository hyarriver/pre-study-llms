import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Menu, X, Home, BookOpen, LogIn, LogOut, User, Upload, ShieldCheck } from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAuth = !!user

  // 确保只在客户端渲染 Portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    queryClient.invalidateQueries({ queryKey: ['chapters'] })
    queryClient.invalidateQueries({ queryKey: ['chapter'] })
    queryClient.invalidateQueries({ queryKey: ['progress'] })
    navigate('/')
    setIsOpen(false)
  }

  const menuItems = [
    { to: '/', label: '首页', icon: Home },
    { to: '/chapters', label: '教程列表', icon: BookOpen },
    ...(isAuth ? [{ to: '/materials/upload', label: '上传资料', icon: Upload }] : []),
    ...(isAuth && user?.role === 'admin' ? [{ to: '/admin', label: '管理', icon: ShieldCheck }] : []),
  ]

  // 菜单内容组件
  const menuContent = (
    <>
      {/* 移动端菜单遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 9998 }}
        />
      )}

      {/* 移动端菜单面板 */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] glass-nav border-l border-white/10 md:hidden transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col h-full">
          {/* 菜单头部 */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              菜单
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="关闭菜单"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 菜单内容 */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] active:scale-[0.98]',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'hover:bg-white/10 active:bg-white/20 text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}

            {/* 用户信息区域 */}
            <div className="pt-4 mt-4 border-t border-white/10">
              {isAuth ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                    <div className="p-2 rounded-full bg-primary/20">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">已登录</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start min-h-[44px] touch-manipulation"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </Button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors touch-manipulation min-h-[44px] active:scale-[0.98]',
                    location.pathname === '/login'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'hover:bg-white/10 active:bg-white/20 text-foreground'
                  )}
                >
                  <LogIn className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">登录 / 注册</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* 汉堡菜单按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center relative z-30"
        aria-label="菜单"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* 使用 Portal 将菜单渲染到 body 下 */}
      {mounted && createPortal(menuContent, document.body)}
    </>
  )
}
