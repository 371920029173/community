'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { 
  Crown, 
  Eye, 
  EyeOff, 
  Trash2, 
  Calendar,
  RefreshCw,
  FileText
} from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedUser, setEditedUser] = useState<any>(null)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [submittingAvatar, setSubmittingAvatar] = useState(false)
  const [sandCoins, setSandCoins] = useState(0)
  const [forums, setForums] = useState<any[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

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

  // 获取用户创建的论坛
  const fetchForums = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/forums/my-forums', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setForums(result.data || [])
      }
    } catch (error) {
      console.error('获取论坛失败:', error)
    }
  }, [user?.id])

  // 获取记事本内容
  const fetchNote = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setNoteContent(result.data?.content || '')
      }
    } catch (error) {
      console.error('获取记事本失败:', error)
    }
  }, [user?.id])

  // 保存记事本（自动保存）
  const saveNote = useCallback(async (content: string) => {
    if (!user?.id) return

    try {
      setNoteSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ content })
      })

      const result = await response.json()
      if (!result.success) {
        console.error('保存记事本失败:', result.error)
      }
    } catch (error) {
      console.error('保存记事本失败:', error)
    } finally {
      setNoteSaving(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      setEditedUser({ username: user.username, nickname_color: user.nickname_color || '#3B82F6' })
      fetchSandCoins()
      fetchForums()
      fetchNote()
    }
  }, [user, fetchSandCoins, fetchForums, fetchNote])

  // 自动保存记事本（防抖）
  useEffect(() => {
    if (!user || noteContent === '') return

    const timer = setTimeout(() => {
      saveNote(noteContent)
    }, 2000) // 2秒后自动保存

    return () => clearTimeout(timer)
  }, [noteContent, user, saveNote])

  const handleSave = async () => {
    if (!user || !editedUser) return
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          username: editedUser.username,
          nickname_color: editedUser.nickname_color
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('个人资料已更新')
        setIsEditing(false)
        refreshUser && refreshUser()
      } else {
        toast.error(json.error || '更新失败')
      }
    } catch (e) {
      console.error(e)
      toast.error('更新失败')
    } finally {
      setSaving(false)
    }
  }

  const submitAvatarRequest = async () => {
    if (!user) return
    if (!avatarFile) {
      toast.error('请先选择图片文件')
      return
    }
    
    try {
      setSubmittingAvatar(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const bucket = 'avatars'
      const ext = avatarFile.name.split('.').pop() || 'png'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadRes, error: uploadErr } = await supabase.storage.from(bucket).upload(path, avatarFile, { upsert: false, cacheControl: '3600' })
      if (uploadErr) {
        toast.error('上传失败：' + uploadErr.message)
        return
      }
      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(uploadRes.path)
      const finalUrl = publicUrl.publicUrl

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ new_avatar_url: finalUrl })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('已提交头像审核')
        setAvatarFile(null)
      } else {
        toast.error(json.error || '提交失败')
      }
    } catch (e) {
      console.error(e)
      toast.error('提交失败')
    } finally {
      setSubmittingAvatar(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 text-center border border-white/30">
            <h1 className="text-2xl font-bold text-gray-900">请先登录</h1>
            <p className="text-gray-600 mt-2">登录后可编辑个人资料并提交头像审核</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">基本信息</h2>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">编辑</button>
                ) : (
                  <div className="space-x-2">
                    <button disabled={saving} onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
                    <button disabled={saving} onClick={() => { setIsEditing(false); setEditedUser({ username: user.username, nickname_color: user.nickname_color || '#3B82F6' }) }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">取消</button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">用户名</label>
                  {isEditing ? (
                    <input value={editedUser?.username || ''} onChange={e => setEditedUser((p:any)=>({ ...p, username: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <p className="text-gray-900">{user.username}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">邮箱</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">昵称颜色</label>
                  {isEditing ? (
                    <input type="color" value={editedUser?.nickname_color || '#3B82F6'} onChange={e => setEditedUser((p:any)=>({ ...p, nickname_color: e.target.value }))} className="w-16 h-10 border rounded" />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full border" style={{ backgroundColor: user.nickname_color }} />
                      <span className="text-gray-900">{user.nickname_color}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">更换头像（提交审核）</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input id="avatarFile" type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
                  <label htmlFor="avatarFile" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    选择文件
                  </label>
                  <span className="text-sm text-gray-500 truncate max-w-[50%]">
                    {avatarFile ? avatarFile.name : '未选择任何文件'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button disabled={submittingAvatar || !avatarFile} onClick={submitAvatarRequest} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submittingAvatar ? '提交中…' : '提交审核'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">请选择图片文件上传。提交后由审核员审批。</p>
              </div>
            </div>

            {/* 我的论坛 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">我的论坛</h2>
                <Link href="/forums" className="text-sm text-blue-600 hover:text-blue-700">
                  创建新论坛 →
                </Link>
              </div>
              {forums.length === 0 ? (
                <p className="text-gray-500 text-sm">您还没有创建任何论坛</p>
              ) : (
                <div className="space-y-3">
                  {forums.map((forum) => (
                    <div key={forum.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <Link href={`/forums/${forum.id}`} className="flex-1">
                          <h3 className="font-medium text-gray-900 hover:text-blue-600">{forum.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            过期时间：{new Date(forum.expires_at).toLocaleDateString('zh-CN')}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={async () => {
                              try {
                                const { data: { session } } = await supabase.auth.getSession()
                                if (!session) return

                                const response = await fetch(`/api/forums/${forum.id}/hide`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`
                                  }
                                })

                                const result = await response.json()
                                if (result.success) {
                                  toast.success(forum.is_hidden ? '论坛已显示' : '论坛已隐藏')
                                  fetchForums()
                                } else {
                                  toast.error(result.error || '操作失败')
                                }
                              } catch (error) {
                                toast.error('操作失败')
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600"
                            title={forum.is_hidden ? '显示论坛' : '隐藏论坛'}
                          >
                            {forum.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('确定要删除这个论坛吗？此操作不可恢复。')) return

                              try {
                                const { data: { session } } = await supabase.auth.getSession()
                                if (!session) return

                                const response = await fetch(`/api/forums/${forum.id}/delete`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`
                                  }
                                })

                                const result = await response.json()
                                if (result.success) {
                                  toast.success('论坛已删除')
                                  fetchForums()
                                } else {
                                  toast.error(result.error || '删除失败')
                                }
                              } catch (error) {
                                toast.error('删除失败')
                              }
                            }}
                            className="p-2 text-red-600 hover:text-red-700"
                            title="删除论坛"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 记事本 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  我的记事本
                </h2>
                {noteSaving && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                )}
              </div>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="在这里记录您的想法..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">内容会自动保存</p>
            </div>
          </div>

          <div>
            {/* 沙币显示 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">我的沙币</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-amber-700 rounded-full"></div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"></div>
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full"></div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-800">{sandCoins}</p>
                  <p className="text-sm text-gray-500">通过点击广告获得</p>
                </div>
              </div>
            </div>

            {/* 账户概览 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">账户概览</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between"><span>管理员</span><span>{user.is_admin ? '是' : '否'}</span></div>
                <div className="flex justify-between"><span>审核员</span><span>{user.is_moderator ? '是' : '否'}</span></div>
                <div className="flex justify-between"><span>注册时间</span><span>{new Date(user.created_at).toLocaleDateString('zh-CN')}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}