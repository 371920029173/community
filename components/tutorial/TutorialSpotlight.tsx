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
  {
    id: 'welcome',
    title: '欢迎使用文件分享平台',
    icon: Sparkles,
    content: (
      <div className="space-y-2">
        <p>这是集文件分享、私信交流、论坛讨论于一体的社区平台。</p>
        <p className="text-sm text-gray-600">接下来将逐一高亮各功能入口并详细说明用法，您可随时点击「跳过此段」。</p>
      </div>
    ),
  },
  {
    id: 'nav-home',
    title: '首页',
    icon: Home,
    content: (
      <div className="space-y-2">
        <p><strong>首页</strong>是平台的动态入口，展示最新上传的公开文件和论坛动态。</p>
        <p className="text-sm text-gray-600">可点击文件卡片查看详情、预览或下载；可进入论坛参与讨论。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="nav-home"]',
    targetPage: '/',
  },
  {
    id: 'nav-files',
    title: '云盘',
    icon: FileText,
    content: (
      <div className="space-y-2">
        <p><strong>云盘</strong>是您的私有文件存储空间，支持图片、视频、音频、文档等多种格式。</p>
        <p className="text-sm text-gray-600">可在此管理已上传文件：删除、下载、预览；上传时可选择「分享到首页」公开展示给其他用户。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="nav-files"]',
    targetPage: '/',
  },
  {
    id: 'nav-messages',
    title: '私信',
    icon: MessageSquare,
    content: (
      <div className="space-y-2">
        <p><strong>私信</strong>支持与平台内用户进行一对一的文字和文件交流。</p>
        <p className="text-sm text-gray-600">在私信页面搜索用户名发起对话；可发送文字或文件；有未读消息时此处会显示红点提醒。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="nav-messages"]',
    targetPage: '/',
  },
  {
    id: 'nav-forums',
    title: '论坛',
    icon: FolderOpen,
    content: (
      <div className="space-y-2">
        <p><strong>论坛</strong>用于创建主题社区、发帖讨论。创建论坛需 30 沙币，续费 25 沙币，更新 3 沙币。</p>
        <p className="text-sm text-gray-600">可浏览、加入已有论坛，或创建自己的论坛；论坛有保质期，到期前需续费。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="nav-forums"]',
    targetPage: '/',
  },
  {
    id: 'nav-profile',
    title: '个人中心',
    icon: User,
    content: (
      <div className="space-y-2">
        <p><strong>个人中心</strong>集中管理您的账户信息与功能入口。</p>
        <p className="text-sm text-gray-600">可编辑昵称、头像、昵称颜色；查看沙币余额与云盘使用情况；获取邀请码；使用私密记事本。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="nav-profile"]',
    targetPage: '/',
  },
  {
    id: 'sand-coins',
    title: '沙币',
    icon: Coins,
    content: (
      <div className="space-y-2">
        <p><strong>沙币</strong>是平台通用积分，用于创建和管理论坛。</p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
          <li>点击广告：每天每个广告限 1 次，每次 5 沙币</li>
          <li>每日登录：首次登录 10 沙币</li>
          <li>停留 10 分钟：单日累计 10 分钟再得 10 沙币</li>
          <li>邀请好友：好友激活后双方各得 20 沙币</li>
        </ul>
      </div>
    ),
    targetSelector: '[data-tutorial="sand-coins"]',
    targetPage: '/',
  },
  {
    id: 'invite',
    title: '邀请好友',
    icon: UserPlus,
    content: (
      <div className="space-y-2">
        <p><strong>邀请好友</strong>可获得沙币奖励。在个人中心复制您的邀请码或邀请链接发给好友。</p>
        <p className="text-sm text-gray-600">好友通过链接注册并完成激活（上传文件 / 发私信 / 创建论坛），且注册满 24 小时后，双方各得 20 沙币。每次复制后邀请码会自动刷新。</p>
      </div>
    ),
    targetSelector: '[data-tutorial="invite"]',
    targetPage: '/profile',
  },
  {
    id: 'end',
    title: '教程结束',
    icon: Sparkles,
    content: (
      <div className="space-y-2">
        <p>您已了解平台的主要功能，如有疑问可前往「帮助」页面查看详细说明。</p>
        <p className="text-amber-700 font-medium">祝您使用愉快！</p>
      </div>
    ),
  },
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
