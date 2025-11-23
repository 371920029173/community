'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import { TopAdBanner } from '@/components/ads/AdBanner'
import { BottomAdBanner } from '@/components/ads/AdBanner'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Crown, 
  Calendar,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface Forum {
  id: string
  title: string
  description: string
  current_topic: string
  announcement: string
  owner_id: string
  expires_at: string
  owner: {
    username: string
    nickname?: string
    avatar_url?: string
  }
}

interface ForumMessage {
  id: string
  content: string
  message_type: string
  created_at: string
  sender: {
    id: string
    username: string
    nickname?: string
    avatar_url?: string
    nickname_color?: string
  }
  file?: {
    id: string
    original_name: string
    file_url: string
  }
}

export default function ForumDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [forum, setForum] = useState<Forum | null>(null)
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sandCoins, setSandCoins] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取论坛详情
  const fetchForum = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/forums/${params.id}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      })

      const result = await response.json()
      if (result.success) {
        setForum(result.data.forum)
        setIsMember(result.data.isMember)
        setIsOwner(result.data.isOwner)
      } else {
        toast.error(result.error || '获取论坛失败')
        router.push('/forums')
      }
    } catch (error: any) {
      console.error('获取论坛失败:', error)
      toast.error('获取论坛失败')
      router.push('/forums')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  // 获取消息列表
  const fetchMessages = useCallback(async () => {
    if (!isMember && !isOwner) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/forums/${params.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setMessages(result.data || [])
      }
    } catch (error: any) {
      console.error('获取消息失败:', error)
    }
  }, [params.id, isMember, isOwner])

  // 加入论坛
  const handleJoinForum = async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/forums/${params.id}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        toast.success('已加入论坛')
        setIsMember(true)
        fetchMessages()
      } else {
        toast.error(result.error || '加入失败')
      }
    } catch (error: any) {
      console.error('加入论坛失败:', error)
      toast.error('加入失败')
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!messageContent.trim()) return
    if (!user || !isMember) {
      toast.error('请先加入论坛')
      return
    }

    try {
      setSending(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/forums/${params.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ content: messageContent.trim() })
      })

      const result = await response.json()
      if (result.success) {
        setMessageContent('')
        fetchMessages()
      } else {
        toast.error(result.error || '发送失败')
      }
    } catch (error: any) {
      console.error('发送消息失败:', error)
      toast.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  // 获取沙币数量
  const fetchSandCoins = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/user/coins?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSandCoins(data.coins || 0)
        }
      }
    } catch (error) {
      console.error('获取沙币失败:', error)
    }
  }, [user?.id])

  useEffect(() => {
    fetchForum()
    if (user) {
      fetchSandCoins()
    }
  }, [user, fetchForum, fetchSandCoins])

  useEffect(() => {
    if (isMember || isOwner) {
      fetchMessages()
      // 每5秒刷新一次消息
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [isMember, isOwner, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  if (!forum) {
    return null
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) {
      return '已过期'
    } else if (days === 0) {
      return '今天过期'
    } else if (days <= 5) {
      return `${days}天后过期`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <TopAdBanner />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Link 
          href="/forums"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回论坛大厅
        </Link>

        {/* 论坛信息 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{forum.title}</h1>
                {isOwner && (
                  <Crown className="w-6 h-6 text-yellow-500" />
                )}
              </div>
              {forum.description && (
                <p className="text-gray-600 mb-3">{forum.description}</p>
              )}
              {forum.announcement && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                  <p className="text-sm font-medium text-yellow-900 mb-1">论坛公告</p>
                  <p className="text-sm text-yellow-800">{forum.announcement}</p>
                </div>
              )}
              {forum.current_topic && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">当前讨论</p>
                  <p className="text-sm text-blue-700">{forum.current_topic}</p>
                </div>
              )}
            </div>
            {isOwner && (
              <Link
                href={`/forums/${params.id}/manage`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                管理论坛
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {forum.owner.avatar_url ? (
                  <img 
                    src={forum.owner.avatar_url} 
                    alt={forum.owner.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                    {forum.owner.username[0]}
                  </div>
                )}
                <span className="text-gray-700">{forum.owner.nickname || forum.owner.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatTime(forum.expires_at)}</span>
              </div>
            </div>
            {!isMember && !isOwner && user && (
              <button
                onClick={handleJoinForum}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                加入论坛
              </button>
            )}
          </div>
        </div>

        {/* 消息区域 */}
        {(isMember || isOwner) ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow flex flex-col" style={{ height: '600px' }}>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">暂无消息，开始讨论吧！</div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    {message.sender.avatar_url ? (
                      <img 
                        src={message.sender.avatar_url} 
                        alt={message.sender.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {message.sender.username[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-sm font-medium"
                          style={{ color: message.sender.nickname_color || '#374151' }}
                        >
                          {message.sender.nickname || message.sender.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-gray-800 whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      {message.file && (
                        <a
                          href={message.file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          📎 {message.file.original_name}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageContent.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  发送
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow text-center">
            <p className="text-gray-600 mb-4">加入论坛后即可参与讨论</p>
            {user ? (
              <button
                onClick={handleJoinForum}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                加入论坛
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                登录后加入
              </Link>
            )}
          </div>
        )}
      </main>

      <BottomAdBanner />
    </div>
  )
}

