'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import { TopAdBanner } from '@/components/ads/AdBanner'
import { BottomAdBanner } from '@/components/ads/AdBanner'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Users, 
  MessageSquare, 
  Calendar,
  Crown,
  Eye,
  EyeOff
} from 'lucide-react'

interface Forum {
  id: string
  title: string
  description: string
  current_topic: string
  owner_id: string
  owner: {
    username: string
    nickname?: string
    avatar_url?: string
  }
  expires_at: string
  created_at: string
  member_count?: number
}

export default function ForumsPage() {
  const { user } = useAuth()
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sandCoins, setSandCoins] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    current_topic: ''
  })

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

  // 获取论坛列表
  const fetchForums = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const response = await fetch('/api/forums/list?public=true')
        const result = await response.json()
        if (result.success) {
          setForums(result.data || [])
        }
        return
      }

      const response = await fetch('/api/forums/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const result = await response.json()
      if (result.success) {
        setForums(result.data || [])
      } else {
        toast.error(result.error || '获取论坛列表失败')
      }
    } catch (error: any) {
      console.error('获取论坛列表失败:', error)
      toast.error('获取论坛列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 创建论坛
  const handleCreateForum = async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }

    if (!createForm.title.trim()) {
      toast.error('请输入论坛标题')
      return
    }

    if (sandCoins < 30) {
      toast.error('沙币不足，创建论坛需要30个沙币')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch('/api/forums/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(createForm)
      })

      const result = await response.json()
      if (result.success) {
        toast.success('论坛创建成功！')
        setShowCreateModal(false)
        setCreateForm({ title: '', description: '', current_topic: '' })
        fetchForums()
        fetchSandCoins()
      } else {
        toast.error(result.error || '创建失败')
      }
    } catch (error: any) {
      console.error('创建论坛失败:', error)
      toast.error('创建失败')
    }
  }

  useEffect(() => {
    fetchForums()
    if (user) {
      fetchSandCoins()
    }
  }, [user, fetchForums, fetchSandCoins])

  const filteredForums = forums.filter(forum => 
    forum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forum.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forum.current_topic?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">论坛大厅</h1>
          <p className="text-gray-600">发现和加入感兴趣的论坛，与志同道合的人交流</p>
        </div>

        {/* 搜索和创建 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索论坛..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              创建我的论坛+
            </button>
          )}
        </div>

        {/* 论坛列表 */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : filteredForums.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? '没有找到匹配的论坛' : '暂无论坛'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForums.map((forum) => (
              <Link
                key={forum.id}
                href={`/forums/${forum.id}`}
                className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex-1">{forum.title}</h3>
                  {forum.owner_id === user?.id && (
                    <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                
                {forum.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{forum.description}</p>
                )}
                
                {forum.current_topic && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">当前讨论</p>
                    <p className="text-sm text-blue-700 line-clamp-2">{forum.current_topic}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{forum.member_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatTime(forum.expires_at)}</span>
                    </div>
                  </div>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomAdBanner />

      {/* 创建论坛模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">创建论坛</h2>
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                创建论坛需要消耗 <strong>30个沙币</strong>，论坛保质期为 <strong>60天</strong>
              </p>
              <p className="text-sm text-amber-700 mt-1">您当前拥有：<strong>{sandCoins}个沙币</strong></p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">论坛标题 *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入论坛标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">论坛描述</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入论坛描述（可选）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前讨论内容</label>
                <textarea
                  value={createForm.current_topic}
                  onChange={(e) => setCreateForm({ ...createForm, current_topic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入当前讨论内容（可选）"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateForum}
                disabled={sandCoins < 30}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建（消耗30沙币）
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ title: '', description: '', current_topic: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

