'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useUi } from '@/components/providers/UiProvider'
import { getFriendlyErrorMessage } from '@/lib/utils'
import { 
  Home, 
  User, 
  MessageSquare, 
  Cloud, 
  Settings, 
  LogOut,
  Menu,
  X,
  Crown,
  Shield,
  Share2,
  Upload,
  Search,
  Sparkles,
  Coins,
  Users,
  FileText
} from 'lucide-react'

interface Notifications {
  messages: number
  fileReview: number
  storageRequests: number
}

interface UserWithCoins {
  id: string
  username: string
  email?: string
  avatar_url?: string
  nickname?: string
  nickname_color?: string
  is_admin: boolean
  is_moderator: boolean
  created_at: string
  storage_used: number
  storage_limit: number
  sand_coins?: number
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { uiMode, toggleUiMode } = useUi()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notifications>({
    messages: 0,
    fileReview: 0,
    storageRequests: 0
  })
  const [sandCoins, setSandCoins] = useState<number>(0)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('登出错误:', error)
    }
  }

  // 获取通知数量
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 网络请求失败`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        console.log('[Navbar] 通知数据:', data.data, 'messages:', data.data?.messages) // 调试日志
        setNotifications(data.data)
      } else {
        console.warn('获取通知失败:', data.error)
      }
    } catch (error) {
      console.error('获取通知失败:', error)
      // 设置默认值，避免显示错误
      setNotifications({
        messages: 0,
        fileReview: 0,
        storageRequests: 0
      })
    }
  }, [user?.id])

  // 获取沙币数量
  const fetchSandCoins = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/user/coins?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSandCoins(data.coins || 0)
        }
      }
    } catch (error) {
      console.error('获取沙币失败:', error)
    }
  }, [user?.id])

  // 定期获取通知和沙币
  useEffect(() => {
    if (user?.id) {
      // 立即获取一次
      fetchNotifications()
      fetchSandCoins()
      // 每15秒更新一次通知和沙币
      const interval = setInterval(() => {
        fetchNotifications()
        fetchSandCoins()
      }, 15000)
      return () => clearInterval(interval)
    } else {
      // 用户未登录时重置通知和沙币
      setNotifications({
        messages: 0,
        fileReview: 0,
        storageRequests: 0
      })
      setSandCoins(0)
    }
  }, [user?.id, fetchNotifications, fetchSandCoins])

  // 通知红点组件（确保图层正确，在最上层显示）
  const NotificationDot = ({ count, className = "" }: { count: number, className?: string }) => {
    if (count === 0) return null
    
    // 根据数量调整大小
    const isSmallCount = count < 10
    const size = isSmallCount ? 'h-5 w-5' : 'h-6 min-w-6 px-1'
    const textSize = isSmallCount ? 'text-xs' : 'text-[10px]'
    
    return (
      <span 
        className={`absolute -top-1 -right-1 bg-red-500 text-white ${textSize} rounded-full ${size} flex items-center justify-center font-bold shadow-lg border-2 border-white ${className}`}
        style={{ 
          pointerEvents: 'none',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          zIndex: 10000,
          position: 'absolute'
        }}
      >
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return (
    <nav className="nav-minimal sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* 沙币显示（电脑版左侧） */}
            {user && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="relative">
                  <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-700 rounded-full"></div>
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-amber-400 rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-amber-700">{sandCoins}</span>
              </div>
            )}
            <button
              onClick={toggleUiMode}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
              title={uiMode === 'desktop' ? '切换到手机版布局' : '切换到电脑版布局'}
            >
              {uiMode === 'desktop' ? '电脑版' : '手机版'}
            </button>
            <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="首页">
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <Link href="/share" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="文件分享">
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <Link href="/files" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="云盘">
              <Cloud className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <Link href="/search" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="搜索">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <Link href="/fortune" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="占卜">
              <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            <Link href="/forums" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="论坛大厅">
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
            {user && (
              <>
                <Link 
                  href="/messages" 
                  className="relative flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" 
                  title={notifications.messages > 0 ? `私信 (${notifications.messages}条未读)` : '私信'}
                >
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <NotificationDot count={notifications.messages} />
                  </div>
                </Link>
                {(user.is_admin || user.is_moderator) && (
                  <Link href="/admin" className="relative flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group" title="管理后台">
                    <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <NotificationDot count={notifications.fileReview + notifications.storageRequests} />
                  </Link>
                )}
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span 
                    className="text-sm font-medium"
                    style={{ color: user.nickname_color || '#374151' }}
                  >
                    {user.username}
                  </span>
                  {user.username === '371920029173' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white shadow-lg animate-pulse">
                      <Crown className="w-3 h-3 mr-1" />
                      超级管理员
                    </span>
                  )}
                  {user.is_admin && user.username !== '371920029173' && (
                    <Crown className="w-4 h-4 text-yellow-500" aria-label="管理员" />
                  )}
                  {user.is_moderator && user.username !== '371920029173' && (
                    <Shield className="w-4 h-4 text-blue-500" aria-label="审核员" />
                  )}
                </div>
                <Link href="/profile" className="text-gray-700 hover:text-primary-600 transition-colors">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 hover:border-primary-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="btn-secondary">
                  登录
                </Link>
                <Link href="/register" className="btn-primary">
                  注册
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {/* UI 切换开关（移动端）*/}
              <button
                onClick={() => {
                  toggleUiMode()
                  setIsMenuOpen(false)
                }}
                className="w-full mb-2 text-left px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors border border-gray-200 rounded"
                title={uiMode === 'desktop' ? '切换到手机版布局' : '切换到电脑版布局'}
              >
                {uiMode === 'desktop' ? '切换到手机版布局' : '切换到电脑版布局'}
              </button>
              <Link 
                href="/" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                首页
              </Link>
              <Link 
                href="/share" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Share2 className="w-5 h-5" />
                文件分享
              </Link>
              <Link 
                href="/files" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Cloud className="w-5 h-5" />
                云盘
              </Link>
              <Link 
                href="/search" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Search className="w-5 h-5" />
                搜索
              </Link>
              <Link 
                href="/fortune" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Sparkles className="w-5 h-5" />
                占卜
              </Link>
              <Link 
                href="/forums" 
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                论坛大厅
              </Link>
              {user && (
                <>
                  <Link 
                    href="/messages" 
                    className="relative flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="relative">
                      <MessageSquare className="w-5 h-5" />
                      <NotificationDot count={notifications.messages} />
                    </div>
                    <span>私信</span>
                    {notifications.messages > 0 && (
                      <span className="ml-auto text-sm text-red-600 font-semibold">
                        {notifications.messages}条未读
                      </span>
                    )}
                  </Link>
                  {(user.is_admin || user.is_moderator) && (
                    <Link 
                      href="/admin" 
                      className="relative flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      管理后台
                      <NotificationDot count={notifications.fileReview + notifications.storageRequests} />
                    </Link>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {user.username}
                          </span>
                          {user.username === '371920029173' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white shadow-lg animate-pulse">
                              <Crown className="w-3 h-3 mr-1" />
                              超级管理员
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.is_admin && user.username !== '371920029173' && (
                          <Crown className="w-4 h-4 text-yellow-500" aria-label="管理员" />
                        )}
                        {user.is_moderator && user.username !== '371920029173' && (
                          <Shield className="w-4 h-4 text-blue-500" aria-label="审核员" />
                        )}
                      </div>
                    </div>
                    <Link 
                      href="/profile" 
                      className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      个人资料
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-red-600 transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </>
              )}
              {!user && (
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <Link 
                    href="/login" 
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    登录
                  </Link>
                  <Link 
                    href="/register" 
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    注册
                  </Link>
                </div>
              )}
              {/* 沙币显示（手机版菜单底部） */}
              {user && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-amber-700 rounded-full"></div>
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></div>
                        <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-amber-700">沙币</span>
                    </div>
                    <span className="text-lg font-bold text-amber-800">{sandCoins}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 