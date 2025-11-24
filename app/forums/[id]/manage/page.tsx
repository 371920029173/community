'use client'

export const runtime = 'edge'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Trash2, 
  Calendar,
  RefreshCw,
  Save,
  Coins
} from 'lucide-react'

interface Forum {
  id: string
  title: string
  description: string
  current_topic: string
  announcement: string
  owner_id: string
  expires_at: string
  is_hidden: boolean
}

export default function ForumManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth()
  const router = useRouter()
  const [forumId, setForumId] = useState<string>('')
  const [forum, setForum] = useState<Forum | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sandCoins, setSandCoins] = useState(0)
  const [formData, setFormData] = useState({
    current_topic: '',
    announcement: ''
  })

  // 解析 params
  useEffect(() => {
    params.then(({ id }) => setForumId(id))
  }, [params])

  // 获取论坛详情
  const fetchForum = useCallback(async () => {
    if (!forumId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        router.push('/login')
        return
      }

      const response = await fetch(`/api/forums/${forumId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        if (!result.data.isOwner) {
          toast.error('您不是论坛所有者')
          router.push(`/forums/${forumId}`)
          return
        }
        setForum(result.data.forum)
        setFormData({
          current_topic: result.data.forum.current_topic || '',
          announcement: result.data.forum.announcement || ''
        })
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
  }, [forumId, router])

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

  // 保存修改
  const handleSave = async () => {
    if (!forumId) return

    if (sandCoins < 3) {
      toast.error('沙币不足，修改论坛需要3个沙币')
      return
    }

    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/forums/${forumId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (result.success) {
        toast.success('论坛内容已更新')
        fetchForum()
        fetchSandCoins()
      } else {
        toast.error(result.error || '更新失败')
      }
    } catch (error: any) {
      console.error('更新论坛失败:', error)
      toast.error('更新失败')
    } finally {
      setSaving(false)
    }
  }

  // 隐藏/显示论坛
  const handleToggleHide = async () => {
    if (!forumId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/forums/${forumId}/hide`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        toast.success(forum?.is_hidden ? '论坛已显示' : '论坛已隐藏')
        fetchForum()
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error: any) {
      console.error('操作失败:', error)
      toast.error('操作失败')
    }
  }

  // 续费论坛
  const handleRenew = async () => {
    if (!forumId) return

    if (sandCoins < 25) {
      toast.error('沙币不足，续费需要25个沙币')
      return
    }

    if (!confirm('确定要续费30天吗？将消耗25个沙币。')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/forums/${forumId}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        toast.success('论坛已续费30天')
        fetchForum()
        fetchSandCoins()
      } else {
        toast.error(result.error || '续费失败')
      }
    } catch (error: any) {
      console.error('续费失败:', error)
      toast.error('续费失败')
    }
  }

  // 删除论坛
  const handleDelete = async () => {
    if (!forumId) return

    if (!confirm('确定要删除这个论坛吗？此操作不可恢复，所有消息和成员数据将被删除。')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/forums/${forumId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        toast.success('论坛已删除')
        router.push('/forums')
      } else {
        toast.error(result.error || '删除失败')
      }
    } catch (error: any) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  useEffect(() => {
    if (forumId) {
      fetchForum()
    }
    if (user) {
      fetchSandCoins()
    }
  }, [forumId, user, fetchForum, fetchSandCoins])

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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Link 
          href={`/forums/${forumId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回论坛
        </Link>

        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">管理论坛：{forum.title}</h1>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-900 mb-1">论坛状态</p>
                <p className="text-sm text-blue-700">
                  {forum.is_hidden ? '已隐藏' : '正常显示'} · 过期时间：{formatTime(forum.expires_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                  <Coins className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-medium text-amber-800">{sandCoins}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 当前讨论内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                当前讨论内容
              </label>
              <textarea
                value={formData.current_topic}
                onChange={(e) => setFormData({ ...formData, current_topic: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="输入当前讨论内容..."
              />
              <p className="text-xs text-gray-500 mt-1">修改需要消耗3个沙币</p>
            </div>

            {/* 论坛公告 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                论坛公告
              </label>
              <textarea
                value={formData.announcement}
                onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="输入论坛公告..."
              />
              <p className="text-xs text-gray-500 mt-1">修改需要消耗3个沙币</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? '保存中...' : '保存修改（3沙币）'}
            </button>
            <button
              onClick={handleToggleHide}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              {forum.is_hidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              {forum.is_hidden ? '显示论坛' : '隐藏论坛'}
            </button>
            <button
              onClick={handleRenew}
              disabled={sandCoins < 25}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              续费30天（25沙币）
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              删除论坛
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

