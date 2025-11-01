import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { UiProvider } from '@/components/providers/UiProvider'
import MouseTrail from '@/components/effects/MouseTrail'
import ParticlePhysics from '@/components/effects/ParticlePhysics'
import Footer from '@/components/layout/Footer'
import CookieConsent from '@/components/layout/CookieConsent'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '文件分享平台',
  description: '安全、快速、智能的文件分享服务',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Google AdSense Verification Code */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4701068000566326"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={inter.className}>
        {/* 动态粒子物理效果 */}
        <ParticlePhysics />
        
        {/* 鼠标点击特效 */}
        <MouseTrail />
        
        <AuthProvider>
          <UiProvider>
            <div className="flex flex-col min-h-screen">
              {children}
              <Footer />
            </div>
            <CookieConsent />
            <Toaster position="top-right" />
          </UiProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 