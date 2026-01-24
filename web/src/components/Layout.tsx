import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Home, LogIn, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'

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
      <header className={`border-b border-white/10 ${isHomePage ? 'backdrop-blur-xl bg-background/60 sticky top-0 z-30' : 'bg-background/95'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 group">
              <BookOpen className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">动手学大模型</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                asChild
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  首页
                </Link>
              </Button>
              <Button
                variant={location.pathname === '/chapters' ? 'default' : 'ghost'}
                asChild
              >
                <Link to="/chapters">
                  <BookOpen className="mr-2 h-4 w-4" />
                  教程列表
                </Link>
              </Button>
              {isAuth ? (
                <>
                  <span className="text-sm text-muted-foreground">{user.username}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    退出
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
                    登录 / 注册
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className={isHomePage ? '' : 'container mx-auto px-4 py-8'}>
        {children}
      </main>
      <footer className={`border-t border-white/10 ${isHomePage ? 'backdrop-blur-xl bg-background/60 relative z-20' : 'bg-background/95'}`}>
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>《动手学大模型》系列编程实践教程 · 上海交通大学</p>
        </div>
      </footer>
    </div>
  )
}
