'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Upload,
  MessageSquare,
  FolderOpen,
  Coins,
  UserPlus,
  User,
  FileText,
  ChevronRight,
  SkipForward,
  X,
  Sparkles,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export interface SpotlightStep {
  id: string
  title: string
  icon: React.ElementType
  content: React.ReactNode
  targetSelector?: string
  targetPage?: string
}

const SPOTLIGHT_STEPS: SpotlightStep[] = [
  { id: 'welcome', title: '欢迎使用文件分享平台', icon: Sparkles, content: (<p>接下来将高亮介绍各功能入口，您可随时跳过某段。</p>) },
  { id: 'nav-home', title: '首页', icon: Home, content: (<p>点击进入首页，浏览最新文件和论坛预览。</p>), targetSelector: '[data-tutorial="nav-home"]', targetPage: '/' },
  { id: 'nav-files', title: '云盘', icon: FileText, content: (<p>云盘管理您的私有文件，可删除、下载、预览。</p>), targetSelector: '[data-tutorial="nav-files"]', targetPage: '/' },
  { id: 'nav-messages', title: '私信', icon: MessageSquare, content: (<p>与平台用户一对一发送文字和文件。</p>), targetSelector: '[data-tutorial="nav-messages"]', targetPage: '/' },
  { id: 'nav-forums', title: '论坛', icon: FolderOpen, content: (<p>浏览或创建论坛，参与主题讨论。</p>), targetSelector: '[data-tutorial="nav-forums"]', targetPage: '/' },
  { id: 'nav-profile', title: '个人中心', icon: User, content: (<p>管理资料、沙币、邀请码、记事本。</p>), targetSelector: '[data-tutorial="nav-profile"]', targetPage: '/' },
  { id: 'sand-coins', title: '沙币', icon: Coins, content: (<p>点击广告、每日登录、停留、邀请获得沙币，用于创建论坛。</p>), targetSelector: '[data-tutorial="sand-coins"]', targetPage: '/' },
  { id: 'invite', title: '邀请好友', icon: UserPlus, content: (<p>个人中心可复制邀请码和链接，好友激活后双方各得20沙币。</p>), targetSelector: '[data-tutorial="invite"]', targetPage: '/profile' },
  { id: 'end', title: '教程结束', icon: Sparkles, content: (<p>祝您使用愉快！</p>) },
]

interface TutorialSpotlightProps {
  open: boolean
  onClose: () => void
  showPlayChoice?: boolean
  onPlayChoice?: (playOnLogin: boolean) => void
  onComplete?: () => void
}

export function TutorialSpotlight({ open, onClose, showPlayChoice = false, onPlayChoice, onComplete }: TutorialSpotlightProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [showChoice, setShowChoice] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const current = SPOTLIGHT_STEPS[step]
  const isLast = step === SPOTLIGHT_STEPS.length - 1
  const measureRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  const measureTarget = useCallback(() => {
    if (!current?.targetSelector || typeof document === 'undefined') {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(current.targetSelector)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [current?.targetSelector])

  useEffect(() => {
    if (!open) return
    const tick = () => {
      measureTarget()
      measureRef.current = requestAnimationFrame(tick)
    }
    measureRef.current = requestAnimationFrame(tick)
    return () => {
      if (measureRef.current) cancelAnimationFrame(measureRef.current)
    }
  }, [open, measureTarget])

  useEffect(() => {
    if (!open || !current?.targetPage) return
    if (current.targetPage !== pathname) {
      router.push(current.targetPage)
    }
  }, [open, current?.targetPage, pathname, router])

  useEffect(() => {
    if (open) {
      setStep(0)
      setShowChoice(false)
    }
  }, [open])

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete?.()
      if (showPlayChoice && onPlayChoice) {
        setShowChoice(true)
      } else {
        onClose()
      }
    } else {
      setStep((s) => Math.min(s + 1, SPOTLIGHT_STEPS.length - 1))
    }
  }, [isLast, showPlayChoice, onPlayChoice, onComplete, onClose])

  const handleSkip = useCallback(() => {
    if (isLast) handleNext()
    else setStep((s) => Math.min(s + 1, SPOTLIGHT_STEPS.length - 1))
  }, [isLast, handleNext])

  const handleChoice = useCallback((playOnLogin: boolean) => {
    onPlayChoice?.(playOnLogin)
    setShowChoice(false)
    onClose()
  }, [onPlayChoice, onClose])

  const handleClose = useCallback(() => {
    if (!showChoice) onClose()
  }, [showChoice, onClose])

  if (!open) return null

  const Icon = current?.icon || Sparkles
  const hasTarget = !!current?.targetSelector && !!targetRect

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        onClick={handleClose}
      >
        {/* 遮光玻璃层：有目标时由挖空区域的 box-shadow 实现，无目标时全屏遮罩 */}
        {!hasTarget && <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />}
        
        {/* 高亮挖空区域：透明中心 + 四周 box-shadow 形成遮光效果 */}
        {hasTarget && targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
              borderRadius: 12,
              border: '2px solid rgba(59, 130, 246, 0.8)',
              zIndex: 1,
            }}
          />
        )}

        {/* 说明卡片 - 靠近高亮区域或居中 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-md mx-4 z-[9999]"
          style={{
            top: hasTarget && targetRect
              ? Math.min(targetRect.bottom + 24, typeof window !== 'undefined' ? window.innerHeight - 200 : 400)
              : '50%',
            transform: hasTarget ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {showChoice ? (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">下次登录时是否播放教程？</h3>
              <div className="flex gap-4 justify-center">
                <button onClick={() => handleChoice(true)} className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700">是</button>
                <button onClick={() => handleChoice(false)} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300">否</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-1 bg-gray-200">
                <motion.div className="h-full bg-primary-500" animate={{ width: `${((step + 1) / SPOTLIGHT_STEPS.length) * 100}%` }} transition={{ duration: 0.3 }} />
              </div>
              <div className="p-6">
                <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg" aria-label="关闭"><X className="w-5 h-5" /></button>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shrink-0"><Icon className="w-6 h-6" /></div>
                  <div>
                    <p className="text-xs text-gray-500">{step + 1} / {SPOTLIGHT_STEPS.length}</p>
                    <h2 className="text-lg font-semibold text-gray-900">{current?.title}</h2>
                  </div>
                </div>
                <div className="min-h-[60px] text-gray-700 text-sm mb-4">{current?.content}</div>
                <div className="flex justify-between items-center">
                  <button onClick={handleSkip} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"><SkipForward className="w-4 h-4" />{isLast ? '完成' : '跳过此段'}</button>
                  <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700">{isLast ? '完成' : '下一步'}<ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
