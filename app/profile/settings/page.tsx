'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useTutorial } from '@/components/providers/TutorialProvider'
import toast from 'react-hot-toast'
import { ArrowLeft, Moon, Sun, BookOpen, Settings, Keyboard } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { tutorialPlayOnLogin, setTutorialPlayOnLogin } = useTutorial()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600 dark:text-gray-400">请先登录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回个人中心
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
          <Settings className="w-7 h-7" />
          设置
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">深色模式</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">切换明暗主题</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={e => {
                    const v = e.target.checked
                    setTheme(v ? 'dark' : 'light')
                    toast.success(v ? '已开启深色模式' : '已关闭深色模式')
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">下次登录播放教程</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">登录后是否自动播放新手引导</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tutorialPlayOnLogin}
                  onChange={e => {
                    const v = e.target.checked
                    setTutorialPlayOnLogin(v)
                    toast.success(v ? '已开启' : '已关闭')
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Keyboard className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">键盘快捷键</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">使用键盘快速导航</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">打开新手教程</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">关闭弹窗</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">h</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">首页</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">s</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">文件分享</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">f</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">云盘</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">r</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">搜索</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">u</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">个人中心</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">m</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">私信</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">o</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">论坛</dd>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <dt><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd> → <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">g</kbd></dt>
                <dd className="text-gray-900 dark:text-gray-100">小游戏</dd>
              </div>
            </dl>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">设置已保存到本地，下次访问时生效</p>
      </main>
    </div>
  )
}
