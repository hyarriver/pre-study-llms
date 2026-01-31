import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Home, LogIn, LogOut, Upload, ShieldCheck, ListOrdered } from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import MobileMenu from './MobileMenu'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAuth = !!user

  const handleLogout = () => {
    logout()
    queryClient.invalidateQueries({ queryKey: ['chapters'] })
    queryClient.invalidateQueries({ queryKey: ['chapter'] })
    queryClient.invalidateQueries({ queryKey: ['progress'] })
    navigate('/')
  }

  const isHomePage = location.pathname === '/'

  return (
    <div className={`min-h-screen ${isHomePage ? '' : 'bg-background'}`}>
      <header className={`border-b border-white/10 ${isHomePage ? 'backdrop-blur-xl bg-background/60 sticky top-0 z-30' : 'bg-background/95 sticky top-0 z-30'}`} style={{ zIndex: 30 }}>
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 group flex-shrink-0 touch-manipulation min-h-[44px]">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                动手学大模型
              </span>
            </Link>
            
            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  <span className="hidden lg:inline">首页</span>
                </Link>
              </Button>
              <Button
                variant={location.pathname === '/chapters' ? 'default' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to="/chapters">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span className="hidden lg:inline">教程列表</span>
                </Link>
              </Button>
              {isAuth && (
                <Button
                  variant={location.pathname === '/materials/upload' ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/materials/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">上传资料</span>
                  </Link>
                </Button>
              )}
              {isAuth && user?.role === 'admin' && (
                <>
                  <Button
                    variant={location.pathname === '/admin/chapters' ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/admin/chapters">
                      <ListOrdered className="mr-2 h-4 w-4" />
                      <span className="hidden lg:inline">学习目录</span>
                    </Link>
                  </Button>
                  <Button
                    variant={location.pathname === '/admin/materials' ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/admin/materials">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span className="hidden lg:inline">管理审核</span>
                    </Link>
                  </Button>
                </>
              )}
              {isAuth ? (
                <>
                  <span className="text-xs lg:text-sm text-muted-foreground hidden xl:inline">
                    {user.username}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">退出</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant={location.pathname === '/login' ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">登录 / 注册</span>
                  </Link>
                </Button>
              )}
            </nav>

            {/* 移动端菜单 */}
            <div className="md:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </header>
      <main className={isHomePage ? '' : 'container mx-auto px-4 sm:px-6 py-4 sm:py-8'}>
        {children}
      </main>
      <footer className={`border-t border-white/10 ${isHomePage ? 'backdrop-blur-xl bg-background/60 relative z-20' : 'bg-background/95'}`}>
        <div className="container mx-auto px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>《动手学大模型》系列编程实践教程 · 上海交通大学</p>
        </div>
      </footer>
    </div>
  )
}
