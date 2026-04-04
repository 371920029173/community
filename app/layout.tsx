import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { UiProvider } from '@/components/providers/UiProvider'
import { TutorialProvider } from '@/components/providers/TutorialProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { KeyboardShortcutsProvider } from '@/components/providers/KeyboardShortcutsProvider'
import MouseTrail from '@/components/effects/MouseTrail'
import ParticlePhysics from '@/components/effects/ParticlePhysics'
import StayTracking from '@/components/effects/StayTracking'
import Footer from '@/components/layout/Footer'
import CookieConsent from '@/components/layout/CookieConsent'

const inter = Inter({ subsets: ['latin'] })
const notoSansSC = Noto_Sans_SC({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-sc'
})
const notoSerifSC = Noto_Serif_SC({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-sc'
})

export const metadata: Metadata = {
  title: {
    default: '文件分享平台 - 分享、交流、论坛',
    template: '%s | 文件分享平台'
  },
  description: '资源与你同频，信息予你无限。在这里分享文件、交流想法、创建论坛。',
  keywords: ['文件分享', '云盘', '论坛', '资源分享'],
  openGraph: {
    title: '文件分享平台',
    description: '资源与你同频，信息予你无限。',
    type: 'website',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-rounded.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: 'any' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/favicon-rounded.svg',
    apple: '/favicon.png',
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
      <body className={`${inter.className} ${notoSansSC.variable} ${notoSerifSC.variable}`}>
        {/* Adsterra Popunder（每页一个；后台要求靠近 </head>，Next 用 beforeInteractive） */}
        <Script
          id="adsterra-popunder"
          src="https://pl29043353.profitablecpmratenetwork.com/61/5f/20/615f20ff8d5f3c2e2ddc70d0bed9bfad.js"
          strategy="beforeInteractive"
        />
        {/* 动态粒子物理效果 */}
        <ParticlePhysics />
        
        {/* 鼠标点击特效 */}
        <MouseTrail />
        
        <AuthProvider>
          <ThemeProvider>
          <TutorialProvider>
          <KeyboardShortcutsProvider>
          <StayTracking />
          <UiProvider>
            <div className="flex flex-col min-h-screen">
              {children}
              <Footer />
            </div>
            <CookieConsent />
            <Toaster position="top-right" />
          </UiProvider>
          </KeyboardShortcutsProvider>
          </TutorialProvider>
          </ThemeProvider>
        </AuthProvider>
        {/* Adsterra Social Bar（后台要求贴近 </body>） */}
        <Script
          id="adsterra-social-bar"
          src="https://pl29043355.profitablecpmratenetwork.com/75/de/39/75de39b088000e42e0c78ff667ae23c7.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
} 