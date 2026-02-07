'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Crown, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw,
  FileText,
  Cloud,
  MessageSquare,
  Upload,
  Sparkles,
  Shield,
  HardDrive,
  Calendar,
  Zap,
  ChevronRight,
  FolderOpen,
  UserPlus,
  Copy,
  BookOpen
} from 'lucide-react'
import { useTutorial } from '@/components/providers/TutorialProvider'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
}

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { openTutorial, tutorialPlayOnLogin, setTutorialPlayOnLogin } = useTutorial()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedUser, setEditedUser] = useState<any>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [submittingAvatar, setSubmittingAvatar] = useState(false)
  const [sandCoins, setSandCoins] = useState(0)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [forums, setForums] = useState<any[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const storageUsed = (user as any)?.storage_used ?? 0
  const storageLimit = (user as any)?.storage_limit ?? 20 * 1024 * 1024 * 1024
  const storagePercent = storageLimit > 0 ? Math.min(100, (storageUsed / storageLimit) * 100) : 0

  const fetchSandCoins = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/user/coins?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) setSandCoins(data.coins || 0)
      }
    } catch (e) { console.error('获取沙币失败:', e) }
  }, [user?.id])

  const fetchForums = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/forums/my-forums', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (json.success) setForums(json.data || [])
    } catch (e) { console.error('获取论坛失败:', e) }
  }, [user?.id])

  const fetchInviteCode = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/user/invite-code', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (json.success && json.data) {
        setInviteCode(json.data.inviteCode || '')
        setInviteUrl(json.data.inviteUrl || '')
      }
    } catch (e) { console.error('获取邀请码失败:', e) }
  }, [user?.id])

  const fetchNote = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/notes', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (json.success) setNoteContent(json.data?.content || '')
    } catch (e) { console.error('获取记事本失败:', e) }
  }, [user?.id])

  const saveNote = useCallback(async (content: string) => {
    if (!user?.id) return
    try {
      setNoteSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ content })
      })
    } catch (e) { console.error('保存记事本失败:', e) } finally { setNoteSaving(false) }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    setEditedUser({ username: user.username, nickname_color: user.nickname_color || '#3B82F6' })
    // 并行请求，减少首屏等待
    Promise.all([fetchSandCoins(), fetchInviteCode(), fetchForums(), fetchNote()])
  }, [user, fetchSandCoins, fetchInviteCode, fetchForums, fetchNote])

  useEffect(() => {
    if (!user || noteContent === '') return
    const t = setTimeout(() => saveNote(noteContent), 2000)
    return () => clearTimeout(t)
  }, [noteContent, user, saveNote])

  const handleSave = async () => {
    if (!user || !editedUser) return
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('会话已过期'); return }
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ username: editedUser.username, nickname_color: editedUser.nickname_color })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('个人资料已更新')
        setIsEditing(false)
        refreshUser?.()
      } else toast.error(json.error || '更新失败')
    } catch (e) {
      console.error(e)
      toast.error('更新失败')
    } finally { setSaving(false) }
  }

  const submitAvatarRequest = async () => {
    if (!user || !avatarFile) { toast.error('请先选择图片文件'); return }
    try {
      setSubmittingAvatar(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('会话已过期'); return }
      const bucket = 'avatars'
      const ext = avatarFile.name.split('.').pop() || 'png'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadRes, error: uploadErr } = await supabase.storage.from(bucket).upload(path, avatarFile, { upsert: false })
      if (uploadErr) { toast.error('上传失败：' + uploadErr.message); return }
      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(uploadRes.path)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ new_avatar_url: publicUrl.publicUrl })
      })
      const json = await res.json()
      if (json.success) { toast.success('已提交头像审核'); setAvatarFile(null) }
      else toast.error(json.error || '提交失败')
    } catch (e) { toast.error('提交失败') } finally { setSubmittingAvatar(false) }
  }

  const quickLinks = [
    { href: '/files', icon: Cloud, label: '云盘', color: 'from-blue-500 to-blue-600' },
    { href: '/messages', icon: MessageSquare, label: '私信', color: 'from-violet-500 to-violet-600' },
    { href: '/upload', icon: Upload, label: '上传', color: 'from-emerald-500 to-emerald-600' },
    { href: '/fortune', icon: Sparkles, label: '占卜', color: 'from-amber-500 to-amber-600' },
    { href: '/forums', icon: FolderOpen, label: '论坛', color: 'from-rose-500 to-rose-600' },
  ]

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <motion.div {...fadeInUp} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/30 shadow-xl">
            <h1 className="text-2xl font-bold text-gray-900">请先登录</h1>
            <p className="text-gray-600 mt-2">登录后可编辑个人资料并提交头像审核</p>
            <Link href="/login" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300">
              去登录
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 顶部头像与基本信息卡片 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl shadow-slate-200/30 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative shrink-0"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-white/60 shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg" style={{ color: user.nickname_color }}>
                      {user.username[0]?.toUpperCase()}
                    </div>
                  )}
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900" style={{ color: user.nickname_color || undefined }}>{user.username}</h1>
                    {user.is_admin && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1"><Crown className="w-3 h-3" /> 管理员</span>}
                    {user.is_moderator && !user.is_admin && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"><Shield className="w-3 h-3" /> 审核员</span>}
                  </div>
                  <p className="text-gray-500 text-sm flex items-center justify-center sm:justify-start gap-1"><Calendar className="w-4 h-4" /> 注册于 {new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  {user.email && <p className="text-gray-500 text-sm mt-1">{user.email}</p>}
                </div>
              </div>
            </motion.div>

            {/* 快捷入口 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-200/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> 快捷入口</h2>
                <button onClick={openTutorial} className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
                  <BookOpen className="w-4 h-4" /> 使用教程
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {quickLinks.map((link, i) => (
                  <motion.div key={link.href} variants={fadeInUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
                    <Link href={link.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 hover:shadow-md transition-all duration-300 group">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 基本信息编辑 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl shadow-slate-200/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">基本信息</h2>
                {!isEditing ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">编辑</motion.button>
                ) : (
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.98 }} disabled={saving} onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中…' : '保存'}</motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} disabled={saving} onClick={() => { setIsEditing(false); setEditedUser({ username: user.username, nickname_color: user.nickname_color || '#3B82F6' }) }} className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50">取消</motion.button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">用户名</label>
                  {isEditing ? (
                    <input value={editedUser?.username || ''} onChange={e => setEditedUser((p: any) => ({ ...p, username: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" />
                  ) : (
                    <p className="text-gray-900 font-medium">{user.username}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">昵称颜色</label>
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input type="color" value={editedUser?.nickname_color || '#3B82F6'} onChange={e => setEditedUser((p: any) => ({ ...p, nickname_color: e.target.value }))} className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer" />
                      <span className="text-gray-600">{editedUser?.nickname_color || '#3B82F6'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full border-2 border-gray-200 shadow-inner" style={{ backgroundColor: user.nickname_color }} />
                      <span className="text-gray-900">{user.nickname_color}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 更换头像 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl shadow-slate-200/30">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">更换头像</h2>
              <div className="flex flex-wrap items-center gap-4">
                <input id="avatarFile" type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
                <motion.label htmlFor="avatarFile" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors">选择文件</motion.label>
                <span className="text-sm text-gray-500 max-w-[200px] truncate">{avatarFile ? avatarFile.name : '未选择'}</span>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={submittingAvatar || !avatarFile} onClick={submitAvatarRequest} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submittingAvatar ? '提交中…' : '提交审核'}
                </motion.button>
              </div>
              <p className="text-xs text-gray-500 mt-3">提交后由审核员审批</p>
            </motion.div>

            {/* 我的论坛 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl shadow-slate-200/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">我的论坛</h2>
                <Link href="/forums" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors">
                  创建新论坛 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {forums.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">您还没有创建任何论坛</p>
              ) : (
                <div className="space-y-3">
                  {forums.map((forum, i) => (
                    <motion.div key={forum.id} variants={fadeInUp} whileHover={{ x: 4 }} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/forums/${forum.id}`} className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 hover:text-blue-600 truncate">{forum.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">过期：{new Date(forum.expires_at).toLocaleDateString('zh-CN')}</p>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={async () => {
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session) return
                              const res = await fetch(`/api/forums/${forum.id}/hide`, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` } })
                              const json = await res.json()
                              if (json.success) { toast.success(forum.is_hidden ? '已显示' : '已隐藏'); fetchForums() }
                              else toast.error(json.error || '操作失败')
                            } catch { toast.error('操作失败') }
                          }} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title={forum.is_hidden ? '显示' : '隐藏'}>
                            {forum.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={async () => {
                            if (!confirm('确定删除？不可恢复。')) return
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session) return
                              const res = await fetch(`/api/forums/${forum.id}/delete`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } })
                              const json = await res.json()
                              if (json.success) { toast.success('已删除'); fetchForums() }
                              else toast.error(json.error || '删除失败')
                            } catch { toast.error('删除失败') }
                          }} className="p-2 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* 记事本 */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl shadow-slate-200/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" /> 我的记事本</h2>
                {noteSaving && <span className="text-sm text-gray-500 flex items-center gap-1"><RefreshCw className="w-4 h-4 animate-spin" /> 保存中...</span>}
              </div>
              <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="在这里记录您的想法..." className="w-full h-56 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-all duration-200" />
              <p className="text-xs text-gray-500 mt-2">内容会自动保存</p>
            </motion.div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 沙币 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="bg-gradient-to-br from-amber-50 to-amber-100/80 backdrop-blur-xl rounded-2xl p-6 border border-amber-200/60 shadow-xl shadow-amber-200/20">
              <h2 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"><div className="w-4 h-4 bg-amber-700 rounded-full" /></div>
                我的沙币
              </h2>
              <p className="text-3xl font-bold text-amber-800">{sandCoins}</p>
              <p className="text-sm text-amber-700/80 mt-1">点击广告、每日登录、停留、邀请获得</p>
            </motion.div>

            {/* 邀请好友 */}
            <motion.div data-tutorial="invite" variants={fadeInUp} whileHover={{ y: -2 }} className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-200/30">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-500" /> 邀请好友</h2>
              {inviteCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono text-gray-800">{inviteCode}</code>
                    <button onClick={async () => { if (navigator.clipboard) { await navigator.clipboard.writeText(inviteCode); toast.success('已复制'); try { const { data: { session } } = await supabase.auth.getSession(); if (session) { const r = await fetch('/api/user/invite-code', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` } }); const j = await r.json(); if (j.success && j.data) { setInviteCode(j.data.inviteCode); setInviteUrl(j.data.inviteUrl); } } } catch (_) {} } }} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><Copy className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={inviteUrl} className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-xs text-gray-600 truncate" />
                    <button onClick={async () => { if (navigator.clipboard) { await navigator.clipboard.writeText(inviteUrl); toast.success('链接已复制'); try { const { data: { session } } = await supabase.auth.getSession(); if (session) { const r = await fetch('/api/user/invite-code', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` } }); const j = await r.json(); if (j.success && j.data) { setInviteCode(j.data.inviteCode); setInviteUrl(j.data.inviteUrl); } } } catch (_) {} } }} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><Copy className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-amber-600 font-medium">每次使用后邀请码将自动刷新，请使用最新链接</p>
                  <p className="text-xs text-gray-500">好友注册并完成激活（上传/发消息/创建论坛），满24小时后双方各得20沙币</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">加载中...</p>
              )}
            </motion.div>

            {/* 云盘存储 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-200/30">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><HardDrive className="w-5 h-5 text-blue-500" /> 云盘存储</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">已用</span>
                  <span className="font-medium text-gray-900">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${storagePercent}%` }} transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }} className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                </div>
              </div>
              <Link href="/files" className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                管理云盘 <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* 账户概览 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-200/30">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">账户概览</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between py-2 border-b border-gray-100"><span>管理员</span><span className="font-medium">{user.is_admin ? '是' : '否'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span>审核员</span><span className="font-medium">{user.is_moderator ? '是' : '否'}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 items-center"><span>下次登录播放教程</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={tutorialPlayOnLogin} onChange={e => { const v = e.target.checked; setTutorialPlayOnLogin(v); toast.success(v ? '已开启' : '已关闭') }} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" /></label></div>
                <div className="flex justify-between py-2"><span>注册时间</span><span className="font-medium">{new Date(user.created_at).toLocaleDateString('zh-CN')}</span></div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
