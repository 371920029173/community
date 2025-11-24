'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AdBannerProps {
  position: 'top' | 'sidebar' | 'bottom'
  hasContent?: boolean // 页面是否有实际内容，默认 true（保持向后兼容）
}

export default function AdBanner({ position, hasContent = true }: AdBannerProps) {
  // 如果没有内容，不显示广告（符合 AdSense 政策）
  if (!hasContent) {
    return null
  }
  const { user } = useAuth()
  const adRef = useRef<HTMLDivElement>(null)
  const clickTimestampRef = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)

  // 处理广告点击
  const handleAdClick = async (e: React.MouseEvent) => {
    if (!user) return // 未登录用户不奖励

    // 防止重复点击
    if (isProcessingRef.current) return

    const now = Date.now()
    // 防止快速连续点击（至少间隔1秒）
    if (now - clickTimestampRef.current < 1000) return

    clickTimestampRef.current = now
    isProcessingRef.current = true

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        isProcessingRef.current = false
        return
      }

      const response = await fetch('/api/ads/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          position,
          userAgent: navigator.userAgent,
          timestamp: now
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`获得${result.coinsAwarded}个沙币！`)
      } else if (result.alreadyClicked) {
        // 今天已经点击过，不显示错误提示
      } else {
        // 其他错误不显示提示，避免打扰用户
        console.warn('广告点击奖励失败:', result.error)
      }
    } catch (error) {
      console.error('广告点击处理失败:', error)
    } finally {
      // 延迟重置，防止快速连续点击
      setTimeout(() => {
        isProcessingRef.current = false
      }, 2000)
    }
  }

  useEffect(() => {
    // 初始化 Google AdSense 广告
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error('AdSense 初始化失败:', error)
    }
  }, [])

  const getAdStyles = () => {
    switch (position) {
      case 'top':
        return 'w-full h-20 bg-gradient-to-r from-blue-100 to-purple-100 border-b border-gray-200 relative z-10'
      case 'sidebar':
        return 'w-full h-64 bg-gradient-to-b from-green-100 to-blue-100 rounded-lg border border-gray-200 relative z-10'
      case 'bottom':
        return 'w-full h-24 bg-gradient-to-r from-pink-100 to-orange-100 border-t border-gray-200 relative z-10'
      default:
        return 'w-full h-20 bg-gray-100 relative z-10'
    }
  }

  const getAdContent = () => {
    // Google AdSense 广告单元
    // 注意：需要在 AdSense 后台创建对应的广告单元，并替换 data-ad-slot 值
    // 顶部横幅广告：建议创建 728x90 或响应式横幅广告单元
    // 侧边栏广告：建议创建 300x250 或响应式广告单元
    // 底部横幅广告：建议创建 728x90 或响应式横幅广告单元
    
    // 临时使用占位符 ID，实际部署前需要在 AdSense 后台创建广告单元
    const adSlotId = position === 'top' 
      ? '1234567890'  // 顶部广告单元 ID（需要在 AdSense 后台创建并替换）
      : position === 'sidebar' 
      ? '0987654321'  // 侧边栏广告单元 ID（需要在 AdSense 后台创建并替换）
      : '1122334455'  // 底部广告单元 ID（需要在 AdSense 后台创建并替换）
    
    return (
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4701068000566326"
        data-ad-slot={adSlotId}
        data-ad-format={position === 'sidebar' ? 'auto' : 'horizontal'}
        data-full-width-responsive="true"
      />
    )
  }

  return (
    <div 
      ref={adRef}
      className={`${getAdStyles()} transition-all duration-500 ease-in-out`}
      onClick={user ? handleAdClick : undefined}
      title={user ? '点击广告可获得5个沙币（每天每个位置限1次）' : undefined}
    >
      {getAdContent()}
    </div>
  )
}

// 顶部广告栏
export function TopAdBanner({ hasContent = true }: { hasContent?: boolean }) {
  return <AdBanner position="top" hasContent={hasContent} />
}

// 侧边栏广告
export function SidebarAd({ hasContent = true }: { hasContent?: boolean }) {
  return <AdBanner position="sidebar" hasContent={hasContent} />
}

// 底部广告栏
export function BottomAdBanner({ hasContent = true }: { hasContent?: boolean }) {
  return <AdBanner position="bottom" hasContent={hasContent} />
} 