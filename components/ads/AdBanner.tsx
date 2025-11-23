'use client'

import { useState, useEffect } from 'react'

interface AdBannerProps {
  position: 'top' | 'sidebar' | 'bottom'
  hasContent?: boolean // 页面是否有实际内容，默认 true（保持向后兼容）
}

export default function AdBanner({ position, hasContent = true }: AdBannerProps) {
  // 如果没有内容，不显示广告（符合 AdSense 政策）
  if (!hasContent) {
    return null
  }
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [ads, setAds] = useState<Array<{ id: string; content: string; type: string }>>([])

  useEffect(() => {
    // 模拟广告数据，实际使用时替换为真实的Google AdSense代码
    const mockAds = [
      { id: '1', content: '广告位 1', type: 'banner' },
      { id: '2', content: '广告位 2', type: 'banner' },
      { id: '3', content: '广告位 3', type: 'banner' },
      { id: '4', content: '广告位 4', type: 'banner' },
      { id: '5', content: '广告位 5', type: 'banner' },
      { id: '6', content: '广告位 6', type: 'banner' },
      { id: '7', content: '广告位 7', type: 'banner' },
    ]
    setAds(mockAds)

    // 每30秒切换一次广告
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % mockAds.length)
    }, 30000)

    return () => clearInterval(interval)
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
    if (ads.length === 0) return null

    const currentAd = ads[currentAdIndex]
    
    // 这里可以插入实际的Google AdSense代码
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Google AdSense</div>
          <div className="text-lg font-medium text-gray-700">{currentAd.content}</div>
          <div className="text-xs text-gray-400 mt-1">
            广告位 {currentAdIndex + 1} / {ads.length}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${getAdStyles()} transition-all duration-500 ease-in-out`}>
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