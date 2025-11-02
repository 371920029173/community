'use client'

/**
 * 消息通知红点插件组件
 * 独立组件，可插拔式设计，自动获取并显示未读消息数量
 * 
 * 使用方式：
 * <div className="relative">
 *   <MessageSquare className="w-5 h-5" />
 *   <MessageNotificationBadge userId={user?.id} />
 * </div>
 */
import { useEffect, useState } from 'react'

interface MessageNotificationBadgeProps {
  userId: string | undefined
  className?: string
  /** 更新间隔（毫秒），默认15秒 */
  refreshInterval?: number
}

export default function MessageNotificationBadge({ 
  userId, 
  className = "",
  refreshInterval = 15000 
}: MessageNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  // 获取未读消息数量
  const fetchUnreadCount = async () => {
    if (!userId) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await fetch(`/api/notifications?userId=${userId}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setUnreadCount(data.data.messages || 0)
      }
    } catch (error) {
      console.error('[MessageNotificationBadge] 获取未读消息数量失败:', error)
      setUnreadCount(0)
    }
  }

  // 组件挂载后开始定期更新
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      return
    }

    // 立即获取一次
    fetchUnreadCount()
    
    // 定期更新
    const interval = setInterval(fetchUnreadCount, refreshInterval)
    
    return () => clearInterval(interval)
  }, [userId, refreshInterval])

  // 如果没有未读消息，不显示任何内容
  if (unreadCount === 0) return null

  // 根据数量调整样式
  const isSmallCount = unreadCount < 10
  const size = isSmallCount ? 'w-5 h-5' : 'min-w-6 h-6 px-1.5'
  const textSize = isSmallCount ? 'text-xs' : 'text-[10px]'

  return (
    <span
      className={`absolute -top-1 -right-1 ${size} ${textSize} bg-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white z-[9999] ${className}`}
      style={{
        pointerEvents: 'none',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        position: 'absolute',
        top: '-4px',
        right: '-4px'
      }}
      aria-label={`${unreadCount}条未读消息`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}

