'use client'

import { useState, useCallback, useEffect } from 'react'
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
import Link from 'next/link'

const STORAGE_KEY_COMPLETED = 'tutorial_first_completed'
const STORAGE_KEY_PLAY_ON_LOGIN = 'tutorial_play_on_login'

export function getTutorialCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true'
}

export function getTutorialPlayOnLogin(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_PLAY_ON_LOGIN) === 'true'
}

export function setTutorialCompleted(v: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_COMPLETED, String(v))
}

export function setTutorialPlayOnLogin(v: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PLAY_ON_LOGIN, String(v))
}

export interface TutorialSegment {
  id: string
  title: string
  icon: React.ElementType
  content: React.ReactNode
}

const SEGMENTS: TutorialSegment[] = [
  {
    id: 'welcome',
    title: '欢迎使用文件分享平台',
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-left">
        <p>这是一个集文件分享、私信交流、论坛讨论于一体的社区平台。接下来将带您快速了解各项功能。</p>
        <p className="text-sm text-gray-600">您随时可以跳过某个片段，按需观看。</p>
      </div>
    ),
  },
  {
    id: 'home',
    title: '首页与导航',
    icon: Home,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>首页</strong>展示最新上传的文件和论坛预览，是平台的动态入口。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li><strong>顶部导航</strong>：首页、云盘、上传、私信、论坛、个人中心</li>
          <li><strong>文件网格</strong>：展示最近上传的公开文件，可点击查看详情</li>
          <li><strong>论坛预览</strong>：热门论坛动态</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'files',
    title: '云盘与文件管理',
    icon: FileText,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>云盘</strong>是您的私有文件存储空间。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>在<strong>云盘</strong>页面管理自己的文件：删除、下载、预览</li>
          <li>在<strong>上传</strong>页面将文件上传到云盘</li>
          <li>支持图片、视频、音频、文档等多种格式</li>
          <li>上传后可选择分享到首页公开展示</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'upload',
    title: '上传文件',
    icon: Upload,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>上传流程</strong>：</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>进入「上传」页面，拖拽或点击选择文件</li>
          <li>文件会存入您的云盘</li>
          <li>勾选「分享到首页」可将文件公开展示给其他用户</li>
          <li>请注意存储配额，超出后需清理旧文件</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'messages',
    title: '私信功能',
    icon: MessageSquare,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>私信</strong>支持与平台内用户一对一的文字和文件交流。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>在「私信」页面搜索用户名发起对话</li>
          <li>可发送文字消息和文件</li>
          <li>新消息会在导航栏显示未读提醒</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'forums',
    title: '论坛',
    icon: FolderOpen,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>论坛</strong>用于创建主题讨论社区。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>创建论坛需要 30 沙币，续费 25 沙币，更新 3 沙币</li>
          <li>可浏览、加入已有论坛，或创建自己的论坛</li>
          <li>在论坛内发帖、回复参与讨论</li>
          <li>论坛有保质期，到期前需续费</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'coins',
    title: '沙币获取',
    icon: Coins,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>沙币</strong>是平台通用积分，用于创建和管理论坛。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li><strong>点击广告</strong>：首页顶部/底部广告，每天每个广告限 1 次，每次 5 沙币</li>
          <li><strong>每日登录</strong>：每天首次登录 10 沙币</li>
          <li><strong>停留奖励</strong>：单日在站内停留满 10 分钟再得 10 沙币</li>
          <li><strong>邀请好友</strong>：好友完成激活并满 24 小时后，双方各得 20 沙币</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'invite',
    title: '邀请好友',
    icon: UserPlus,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>邀请奖励</strong>：成功邀请好友，双方各得 20 沙币。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>在<strong>个人中心</strong>查看您的邀请码和邀请链接</li>
          <li>好友通过邀请链接注册，或注册时填写您的邀请码</li>
          <li>好友完成「激活」：上传 1 个文件 / 发送 1 条私信 / 创建 1 个论坛</li>
          <li>注册满 24 小时后自动发放奖励，防刷机制保障公平</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'profile',
    title: '个人中心',
    icon: User,
    content: (
      <div className="space-y-4 text-left">
        <p><strong>个人中心</strong>管理您的资料与功能入口。</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>编辑昵称、头像、昵称颜色</li>
          <li>查看沙币余额、云盘使用情况</li>
          <li>邀请码与邀请链接（可复制）</li>
          <li>记事本：个人私密备忘</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'end',
    title: '教程结束',
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-left">
        <p>您已了解平台的主要功能。如有疑问可前往「帮助」页面查看详细说明。</p>
        <p className="text-amber-700 font-medium">祝您使用愉快！</p>
      </div>
    ),
  },
]

interface TutorialModalProps {
  open: boolean
  onClose: () => void
  showPlayChoice?: boolean
}

export function TutorialModal({ open, onClose, showPlayChoice = false }: TutorialModalProps) {
  const [step, setStep] = useState(0)
  const [showChoice, setShowChoice] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(0)
      setShowChoice(false)
    }
  }, [open])
  const current = SEGMENTS[step]
  const isLast = step === SEGMENTS.length - 1

  const handleNext = useCallback(() => {
    if (isLast) {
      setTutorialCompleted(true)
      if (showPlayChoice) {
        setShowChoice(true)
      } else {
        onClose()
      }
    } else {
      setStep((s) => Math.min(s + 1, SEGMENTS.length - 1))
    }
  }, [isLast, showPlayChoice, onClose])

  const handleSkip = useCallback(() => {
    if (isLast) {
      handleNext()
    } else {
      setStep((s) => Math.min(s + 1, SEGMENTS.length - 1))
    }
  }, [isLast, handleNext])

  const handleChoice = useCallback((playOnLogin: boolean) => {
    setTutorialPlayOnLogin(playOnLogin)
    setShowChoice(false)
    onClose()
  }, [onClose])

  const handleClose = useCallback(() => {
    if (!showChoice) onClose()
  }, [showChoice, onClose])

  const Icon = current?.icon || Sparkles

  return (
    <AnimatePresence>
      {open && (
      <motion.div
        key="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {showChoice ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">下次登录时是否播放教程？</h3>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleChoice(true)}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                  是
                </button>
                <button
                  onClick={() => handleChoice(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  否
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 进度条 */}
              <div className="h-1 bg-gray-200">
                <motion.div
                  className="h-full bg-primary-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / SEGMENTS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="p-8">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shrink-0">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {step + 1} / {SEGMENTS.length}
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900">{current?.title}</h2>
                  </div>
                </div>

                <div className="min-h-[120px] text-gray-700">{current?.content}</div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    onClick={handleSkip}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    <SkipForward className="w-4 h-4" />
                    {isLast ? '完成' : '跳过此段'}
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    {isLast ? '完成' : '下一步'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
