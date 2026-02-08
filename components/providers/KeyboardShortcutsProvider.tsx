'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTutorial } from './TutorialProvider'

const G_TIMEOUT_MS = 800

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { openTutorial } = useTutorial()
  const gPressedAt = useRef<number | null>(null)

  const isEditable = useCallback(() => {
    const el = document.activeElement
    if (!el || !(el instanceof HTMLElement)) return false
    const tag = el.tagName.toLowerCase()
    const role = el.getAttribute('role')
    const isEditable =
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      el.isContentEditable ||
      role === 'textbox' ||
      role === 'searchbox'
    return isEditable
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditable()) return

      const key = e.key.toLowerCase()

      // ? 或 Shift+/ 打开教程
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault()
        openTutorial()
        return
      }

      // Esc 关闭弹窗（通过自定义事件，TutorialSpotlight 等可监听）
      if (key === 'escape') {
        window.dispatchEvent(new CustomEvent('keyboard-shortcut-close'))
        return
      }

      // g 前缀导航：先按 g，再按目标键
      if (key === 'g') {
        const now = Date.now()
        if (gPressedAt.current !== null && now - gPressedAt.current < G_TIMEOUT_MS) {
          // 连按 g 无效，重置
          gPressedAt.current = null
          return
        }
        gPressedAt.current = now
        return
      }

      const now = Date.now()
      if (gPressedAt.current !== null && now - gPressedAt.current < G_TIMEOUT_MS) {
        gPressedAt.current = null
        e.preventDefault()
        switch (key) {
          case 'h':
            router.push('/')
            break
          case 's':
            router.push('/share')
            break
          case 'f':
            router.push('/files')
            break
          case 'r':
            router.push('/search')
            break
          case 'u':
            router.push('/profile')
            break
          case 'm':
            router.push('/messages')
            break
          case 'o':
            router.push('/forums')
            break
          default:
            break
        }
      } else {
        gPressedAt.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [router, openTutorial, isEditable])

  return <>{children}</>
}
