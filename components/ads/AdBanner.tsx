'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AdBannerProps {
  position: 'top' | 'sidebar' | 'bottom'
  hasContent?: boolean // 页面是否有实际内容，默认 true（保持向后兼容）
}

// 广告轮播配置
const AD_ROTATION_INTERVAL = 7000 // 7秒切换一次
const MAX_AD_SLOTS = 15 // 最多15个广告位

export default function AdBanner({ position, hasContent = true }: AdBannerProps) {
  // 如果没有内容，不显示广告（符合 AdSense 政策）
  if (!hasContent) {
    return null
  }
  const { user } = useAuth()
  const clickTimestampRef = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const adRefs = useRef<(HTMLDivElement | null)[]>([])

  // 获取当前广告位的所有广告单元ID（需要在AdSense后台创建15个广告单元）
  const getAdSlotIds = (): string[] => {
    // 根据位置返回对应的15个广告单元ID数组
    // 注意：您需要在AdSense后台创建15个广告单元，然后替换这些占位符ID
    const topAdSlots = [
      '1234567890', '1234567891', '1234567892', '1234567893', '1234567894',
      '1234567895', '1234567896', '1234567897', '1234567898', '1234567899',
      '1234567900', '1234567901', '1234567902', '1234567903', '1234567904'
    ]
    const bottomAdSlots = [
      '1122334455', '1122334456', '1122334457', '1122334458', '1122334459',
      '1122334460', '1122334461', '1122334462', '1122334463', '1122334464',
      '1122334465', '1122334466', '1122334467', '1122334468', '1122334469'
    ]
    
    return position === 'top' ? topAdSlots : bottomAdSlots
  }

  // 处理广告点击（按照Google AdSense要求严格验证）
  const handleAdClick = async (e: React.MouseEvent) => {
    if (!user) return // 未登录用户不奖励

    // 防止重复点击
    if (isProcessingRef.current) return

    const now = Date.now()
    
    // 严格验证1：防止快速连续点击（至少间隔30秒，符合Google要求）
    if (now - clickTimestampRef.current < 30 * 1000) {
      toast.error('点击间隔太短，请稍后再试')
      return
    }

    // 严格验证2：确保点击的是实际广告内容，而不是容器
    const target = e.target as HTMLElement
    const clickedAd = target.closest('.adsbygoogle')
    if (!clickedAd) {
      // 如果点击的不是广告本身，可能是点击了容器，不奖励
      return
    }

    // 严格验证3：检查广告是否真正加载（通过检查广告容器是否有内容）
    const adContainer = adRefs.current[currentAdIndex]
    if (!adContainer) {
      return
    }
    
    const adElement = adContainer.querySelector('.adsbygoogle')
    if (!adElement || !adElement.hasAttribute('data-adsbygoogle-status')) {
      // 广告可能还未加载完成
      toast.error('广告尚未加载完成，请稍后再试')
      return
    }

    clickTimestampRef.current = now
    isProcessingRef.current = true

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        isProcessingRef.current = false
        return
      }

      // 获取当前显示的广告单元ID
      const adSlotIds = getAdSlotIds()
      const currentAdSlotId = adSlotIds[currentAdIndex]

      const response = await fetch('/api/ads/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          position,
          adSlotId: currentAdSlotId, // 传递当前广告单元ID
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

  // 初始化AdSense广告
  useEffect(() => {
    const adSlotIds = getAdSlotIds()
    const actualAdCount = Math.min(adSlotIds.length, MAX_AD_SLOTS)
    
    // 初始化所有广告单元
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        // 延迟初始化，确保DOM已渲染
        setTimeout(() => {
          for (let i = 0; i < actualAdCount; i++) {
            if (adRefs.current[i]) {
              try {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
              } catch (error) {
                console.error(`AdSense 广告 ${i} 初始化失败:`, error)
              }
            }
          }
        }, 500)
      } catch (error) {
        console.error('AdSense 初始化失败:', error)
      }
    }
  }, [position])

  // 广告轮播效果
  useEffect(() => {
    const adSlotIds = getAdSlotIds()
    const actualAdCount = Math.min(adSlotIds.length, MAX_AD_SLOTS)
    
    // 设置轮播定时器
    const rotationTimer = setInterval(() => {
      setCurrentAdIndex((prevIndex) => {
        return (prevIndex + 1) % actualAdCount
      })
    }, AD_ROTATION_INTERVAL)
    
    // 清理定时器
    return () => {
      clearInterval(rotationTimer)
    }
  }, [position])

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

  const adSlotIds = getAdSlotIds()
  const actualAdCount = Math.min(adSlotIds.length, MAX_AD_SLOTS)

  // 计算剩余时间（用于显示倒计时）
  const [timeRemaining, setTimeRemaining] = useState(AD_ROTATION_INTERVAL / 1000)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return AD_ROTATION_INTERVAL / 1000
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentAdIndex])

  // 当广告切换时重置倒计时
  useEffect(() => {
    setTimeRemaining(AD_ROTATION_INTERVAL / 1000)
  }, [currentAdIndex])

  return (
    <div 
      className={`${getAdStyles()} transition-all duration-500 ease-in-out relative`}
      onClick={user ? handleAdClick : undefined}
      title={user ? '点击广告可获得5个沙币（每天每个广告限1次，需真实有效点击）' : undefined}
    >
      {/* 广告轮播标签 - 显示当前广告序号和倒计时 */}
      <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded z-20 flex items-center gap-1">
        <span className="font-semibold">广告 {currentAdIndex + 1}/{actualAdCount}</span>
        <span className="text-gray-300">|</span>
        <span className="text-yellow-300">{timeRemaining}秒</span>
      </div>

      {/* 创建15个广告容器，通过显示/隐藏实现轮播 */}
      {Array.from({ length: actualAdCount }).map((_, index) => {
        const adSlotId = adSlotIds[index]
        const isVisible = index === currentAdIndex
        
        return (
          <div
            key={`ad-${position}-${index}`}
            ref={(el) => {
              adRefs.current[index] = el
            }}
            style={{
              display: isVisible ? 'block' : 'none',
              width: '100%',
              height: '100%'
            }}
          >
            <ins
              className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-4701068000566326"
              data-ad-slot={adSlotId}
              data-ad-format={position === 'sidebar' ? 'auto' : 'horizontal'}
              data-full-width-responsive="true"
            />
          </div>
        )
      })}
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
