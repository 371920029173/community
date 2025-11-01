'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // 检查是否已经同意 Cookie
    const cookieConsent = localStorage.getItem('cookieConsent')
    if (!cookieConsent) {
      // 延迟显示，避免影响首屏体验
      setTimeout(() => {
        setShowBanner(true)
      }, 2000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    localStorage.setItem('cookieConsentDate', new Date().toISOString())
    setShowBanner(false)
  }

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected')
    localStorage.setItem('cookieConsentDate', new Date().toISOString())
    setShowBanner(false)
    // 可选：禁用非必要 Cookie（如 Analytics）
    // 这里可以添加禁用第三方 Cookie 的代码
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Cookie 使用提示
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                我们使用 Cookie 来提供更好的用户体验、分析网站流量，以及（如使用）显示个性化广告。
                继续使用本网站即表示您同意我们使用 Cookie。
                <Link href="/privacy#cookie" className="text-blue-600 hover:underline ml-1">
                  了解更多
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              拒绝
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              接受
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

