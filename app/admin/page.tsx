'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, FileItem, Announcement } from '@/lib/supabase'

// 获取文件类型
const getFileType = (filename: string) => {
  const ext = filename.toLowerCase().split('.').pop()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image'
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) return 'video'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return 'audio'
  if (['pdf'].includes(ext || '')) return 'document'
  if (['txt', 'md', 'json', 'xml', 'js', 'html', 'css'].includes(ext || '')) return 'text'
  return 'file'
}
import Navbar from '@/components/layout/Navbar'
import { 
  Users, 
  FileText, 
  Megaphone, 
  Shield, 
  Crown, 
  CheckCircle, 
  XCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  HardDrive,
  X,
  Trash,
  Loader2,
  Coins
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [avatarRequests, setAvatarRequests] = useState<any[]>([])
  const [adminChangeRequests, setAdminChangeRequests] = useState<any[]>([])
  const [fileAuthors, setFileAuthors] = useState<{[key: string]: string}>({})
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    isActive: true
  })
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [cleaningGhostAccounts, setCleaningGhostAccounts] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [givingCoins, setGivingCoins] = useState<{userId: string, coins: number} | null>(null)
  const [coinsAmount, setCoinsAmount] = useState('')

  useEffect(() => {
    if (user && (user.is_admin || user.is_moderator)) {
      fetchData()
    } else if (user && !user.is_admin && !user.is_moderator) {
      toast.error('权限不足')
      router.push('/')
    }
  }, [user, router])

  // 用户搜索过滤
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.id.includes(userSearchQuery) ||
        (u.nickname && u.nickname.toLowerCase().includes(userSearchQuery.toLowerCase()))
      )
      setFilteredUsers(filtered)
    }
  }, [users, userSearchQuery])

  // 初始化时显示所有用户
  useEffect(() => {
    if (users.length > 0 && filteredUsers.length === 0) {
      setFilteredUsers(users)
    }
  }, [users, filteredUsers.length])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      if (user?.is_admin) {
        // 管理员可以查看所有数据 - 使用API路由绕过RLS
        const [usersResponse, filesData, announcementsData, avatarReq, adminReq] = await Promise.all([
          fetch(`/api/admin/users?adminId=${user.id}`),
          supabase.from('files').select('*').order('created_at', { ascending: false }),
          supabase.from('announcements').select('*').order('created_at', { ascending: false }),
          supabase.from('avatar_change_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
          supabase.from('admin_change_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false })
        ])
        
        const usersResult = await usersResponse.json()
        const usersData = usersResult.success ? { data: usersResult.data } : { data: [] }
        
        setUsers(usersData.data || [])
        setFiles(filesData.data || [])
        setAnnouncements(announcementsData.data || [])
        setAvatarRequests(avatarReq.data || [])
        setAdminChangeRequests(adminReq.data || [])
        
        // 获取文件作者信息
        if (filesData.data && filesData.data.length > 0) {
          const userIds = Array.from(new Set(filesData.data.map(f => f.user_id)))
          const { data: authorsData } = await supabase
            .from('users')
            .select('id, username')
            .in('id', userIds)
          
          if (authorsData) {
            const authorMap: {[key: string]: string} = {}
            authorsData.forEach(author => {
              authorMap[author.id] = author.username
            })
            setFileAuthors(authorMap)
          }
        }
        
        // 调试信息
        console.log('管理后台获取的文件:', filesData.data)
        console.log('待审核文件数量:', filesData.data?.filter(f => !f.is_approved).length || 0)
      } else if (user?.is_moderator) {
        // 审核员只能查看文件
        const { data: filesData } = await supabase
          .from('files')
          .select('*')
          .order('created_at', { ascending: false })
        
        setFiles(filesData || [])
        const { data: avatarReq } = await supabase
          .from('avatar_change_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        setAvatarRequests(avatarReq || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarReview = async (id: string, approve: boolean) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, approve })
      })
      const res = await response.json()
      if (res.success) {
        toast.success(approve ? '头像已通过' : '头像已拒绝')
        
        // 刷新数据，包括头像申请列表
        await fetchData()
        
        // 如果是通过，需要更新所有相关页面的头像显示
        if (approve) {
          // 通知所有页面刷新用户信息
          // 使用自定义事件通知其他页面更新头像
          window.dispatchEvent(new CustomEvent('avatarUpdated', { 
            detail: { userId: res.data?.user_id } 
          }))
          
          // 延迟刷新当前页面，确保数据库更新完成
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        toast.error(res.error || '操作失败')
      }
    } catch (e) {
      console.error('头像审核失败:', e)
      toast.error('操作失败')
    }
  }

  const handleAdminChangeApprove = async (id: string, approve: boolean) => {
    try {
      const response = await fetch('/api/admin/change-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approve })
      })
      const res = await response.json()
      if (res.success) {
        toast.success(approve ? '已批准' : '已拒绝')
        fetchData()
      } else {
        toast.error(res.error || '操作失败')
      }
    } catch (e) {
      toast.error('操作失败')
    }
  }

  const handleUserRoleChange = async (userId: string, field: 'is_admin' | 'is_moderator', value: boolean) => {
    if (!user?.is_admin) return
    
    // 如果是修改管理员身份，且当前用户不是超级管理员，需要发送申请
    if (field === 'is_admin' && user.username !== '371920029173') {
      try {
        const response = await fetch('/api/admin/change-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requesterId: user.id,
            targetUserId: userId,
            action: value ? 'grant_admin' : 'revoke_admin',
            reason: value ? '申请授予管理员权限' : '申请撤销管理员权限'
          })
        })

        const result = await response.json()
        
        if (result.success) {
          toast.success('已提交管理员变更申请，等待超级管理员审批')
          fetchData()
        } else {
          toast.error(result.error || '提交申请失败')
        }
      } catch (error) {
        console.error('Error submitting admin change request:', error)
        toast.error('提交申请失败')
      }
      return
    }
    
    // 超级管理员或修改审核员权限直接执行
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId: userId,
          field: field,
          value: value
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('用户权限更新成功')
        fetchData()
      } else {
        toast.error(result.error || '权限更新失败')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('权限更新失败')
    }
  }

  const handleFileApproval = async (fileId: string, approved: boolean) => {
    try {
      console.log('开始文件审核，fileId:', fileId, 'approved:', approved)
      
      // 获取认证token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }
      
      // 使用API路由来确保管理员权限
      const response = await fetch('/api/admin/files/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId,
          approved
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('文件审核成功:', result)
        toast.success(approved ? '文件审核通过' : '文件审核拒绝')
        
        // 立即更新本地状态，移除已处理的文件
        setFiles(prev => {
          const updated = prev.filter(f => f.id !== fileId)
          console.log('文件审核后，剩余待审核文件数量:', updated.filter(f => !f.is_approved).length)
          console.log('已处理的文件ID:', fileId, '是否从列表中移除:', !updated.find(f => f.id === fileId))
          return updated
        })
      } else {
        console.error('文件审核失败:', result.error)
        toast.error(result.error || '操作失败')
      }
      
    } catch (error) {
      console.error('Error updating file approval:', error)
      toast.error('操作失败')
    }
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)

      if (error) throw error

      toast.success('公告删除成功')
      fetchData()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast.error('公告删除失败')
    }
  }

  const handlePublishAnnouncement = async () => {
    if (!user) return
    
    console.log('发布公告 - 用户信息:', user)
    
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          authorId: user.id,
          authorName: user.username,
          isActive: newAnnouncement.isActive
        })
      })

      const result = await response.json()
      console.log('公告发布响应:', result)
      
      if (result.success) {
        toast.success('公告发布成功！')
        setShowAnnouncementForm(false)
        setNewAnnouncement({ title: '', content: '', type: 'info', isActive: true })
        fetchData()
      } else {
        toast.error(result.error || '发布失败')
      }
    } catch (error) {
      console.error('Error publishing announcement:', error)
      toast.error('发布失败，请重试')
    }
  }

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setNewAnnouncement({
      title: announcement.title,
      content: announcement.content,
      type: (announcement.type as 'info' | 'warning' | 'success' | 'error') || 'info',
      isActive: !!announcement.is_active
    })
  }

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement || !user) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          id: editingAnnouncement.id,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          isActive: newAnnouncement.isActive
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('公告更新成功！')
        setEditingAnnouncement(null)
        setShowAnnouncementForm(false)
        setNewAnnouncement({ title: '', content: '', type: 'info', isActive: true })
        fetchData()
      } else {
        toast.error(result.error || '更新失败')
      }
    } catch (error) {
      console.error('Error updating announcement:', error)
      toast.error('更新失败，请重试')
    }
  }

  const handleCleanupGhostAccounts = async () => {
    if (!user?.is_admin) return
    
    setCleaningGhostAccounts(true)
    setCleanupResult(null)
    
    try {
      // 使用默认 secret，也可以从环境变量获取
      const secret = 'cleanup_ghost_accounts_2024' // 可以改为从配置读取
      const response = await fetch(`/api/admin/cleanup-ghost-accounts?secret=${secret}`)
      const result = await response.json()
      
      if (result.success) {
        setCleanupResult(result.stats)
        toast.success(result.message || '清理完成')
        
        // 刷新用户列表
        await fetchData()
      } else {
        toast.error(result.error || '清理失败')
      }
    } catch (error: any) {
      console.error('清理幽灵账号失败:', error)
      toast.error('清理失败，请重试')
    } finally {
      setCleaningGhostAccounts(false)
    }
  }

  if (!user || (!user.is_admin && !user.is_moderator)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
          <p className="text-gray-600">您没有权限访问此页面</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理后台</h1>
          <p className="text-gray-600">
            欢迎回来，{user.username} 
            {user.is_admin && <Crown className="inline w-5 h-5 ml-2 text-yellow-500" />}
            {user.is_moderator && <Shield className="inline w-5 h-5 ml-2 text-blue-500" />}
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {user.is_admin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                用户管理
              </button>
            )}
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="inline w-4 h-4 mr-2" />
              文件审核
            </button>
            {user.is_admin && (
              <button
                onClick={() => setActiveTab('announcements')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'announcements'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Megaphone className="inline w-4 h-4 mr-2" />
                公告管理
              </button>
            )}
            {user.is_admin && (
              <button
                onClick={() => router.push('/admin/storage')}
                className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <HardDrive className="inline w-4 h4 mr-2" />
                存储管理
              </button>
            )}
            {/* 新增：头像审核 */}
            {(user.is_admin || user.is_moderator) && (
              <button
                onClick={() => setActiveTab('avatar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'avatar'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                头像审核
              </button>
            )}
            {/* 新增：管理员变更审批（仅超管） */}
            {user.username === '371920029173' && (
              <button
                onClick={() => setActiveTab('admin-requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admin-requests'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                管理员变更审批
              </button>
            )}
          </nav>
        </div>

        {/* 用户管理 */}
        {activeTab === 'users' && user.is_admin && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">用户管理</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCleanupGhostAccounts}
                  disabled={cleaningGhostAccounts}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {cleaningGhostAccounts ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>清理中...</span>
                    </>
                  ) : (
                    <>
                      <Trash className="w-4 h-4" />
                      <span>清理幽灵账号</span>
                    </>
                  )}
                </button>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索用户名、ID或昵称..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                  />
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  共 {filteredUsers.length} 个用户
                </span>
              </div>
            </div>
            
            {/* 清理结果展示 */}
            {cleanupResult && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">清理结果</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">总用户数：</span>
                    <span className="font-medium text-gray-900">{cleanupResult.totalUsers}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">有效用户：</span>
                    <span className="font-medium text-green-600">{cleanupResult.validUsers}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">发现幽灵账号：</span>
                    <span className="font-medium text-orange-600">{cleanupResult.ghostAccountsFound}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">已删除：</span>
                    <span className="font-medium text-red-600">{cleanupResult.deletedAccounts}</span>
                  </div>
                </div>
                {cleanupResult.deletedUsers && cleanupResult.deletedUsers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">已删除的账号：</p>
                    <div className="flex flex-wrap gap-2">
                      {cleanupResult.deletedUsers.map((deleted: any, index: number) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {deleted.username} ({deleted.email || '无邮箱'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setCleanupResult(null)}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                >
                  关闭
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/60 backdrop-blur-sm divide-y divide-gray-200">
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {userItem.avatar_url ? (
                              <img 
                                src={userItem.avatar_url} 
                                alt={userItem.username}
                                className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {userItem.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userItem.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              存储: {Math.round(userItem.storage_used / 1024 / 1024)}MB / {Math.round(userItem.storage_limit / 1024 / 1024)}MB
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {userItem.is_admin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Crown className="w-3 h-3 mr-1" />
                              管理员
                            </span>
                          )}
                          {userItem.is_moderator && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Shield className="w-3 h-3 mr-1" />
                              审核员
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userItem.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2 flex-wrap gap-2">
                          {userItem.id !== user.id && (
                            <>
                              <button
                                onClick={() => handleUserRoleChange(userItem.id, 'is_admin', !userItem.is_admin)}
                                className={`px-3 py-1 rounded text-xs ${
                                  userItem.is_admin
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                              >
                                {userItem.is_admin ? '取消管理员' : '设为管理员'}
                              </button>
                              <button
                                onClick={() => handleUserRoleChange(userItem.id, 'is_moderator', !userItem.is_moderator)}
                                className={`px-3 py-1 rounded text-xs ${
                                  userItem.is_moderator
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                              >
                                {userItem.is_moderator ? '取消审核员' : '设为审核员'}
                              </button>
                            </>
                          )}
                          {user.username === '371920029173' && (
                            <button
                              onClick={() => setGivingCoins({ userId: userItem.id, coins: 0 })}
                              className="px-3 py-1 rounded text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1"
                            >
                              <Coins className="w-3 h-3" />
                              给沙币
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 给沙币模态框（仅超管） */}
        {givingCoins && user.username === '371920029173' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">给用户沙币</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">沙币数量</label>
                  <input
                    type="number"
                    value={coinsAmount}
                    onChange={(e) => setCoinsAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入要给予的沙币数量"
                    min="1"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    if (!coinsAmount || parseInt(coinsAmount) <= 0) {
                      toast.error('请输入有效的沙币数量')
                      return
                    }
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) {
                        toast.error('会话已过期')
                        return
                      }
                      const response = await fetch('/api/admin/give-coins', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                          userId: givingCoins.userId,
                          coins: parseInt(coinsAmount)
                        })
                      })
                      const result = await response.json()
                      if (result.success) {
                        toast.success(result.message)
                        setGivingCoins(null)
                        setCoinsAmount('')
                        fetchData()
                      } else {
                        toast.error(result.error || '操作失败')
                      }
                    } catch (error: any) {
                      toast.error('操作失败')
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  确认给予
                </button>
                <button
                  onClick={() => {
                    setGivingCoins(null)
                    setCoinsAmount('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 头像审核面板 */}
        {activeTab === 'avatar' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">头像审核</h2>
            <div className="space-y-4">
              {avatarRequests.filter(req => req.status === 'pending').map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">用户ID：{req.user_id}</p>
                    <p className="text-sm text-gray-500">状态：{req.status}</p>
                    <img src={req.new_avatar_url} alt="avatar" className="w-12 h-12 rounded-full mt-2" />
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleAvatarReview(req.id, true)} className="btn-primary flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" /> 通过
                    </button>
                    <button onClick={() => handleAvatarReview(req.id, false)} className="btn-secondary flex items-center">
                      <XCircle className="w-4 h-4 mr-1" /> 拒绝
                    </button>
                  </div>
                </div>
              ))}
              {avatarRequests.filter(req => req.status === 'pending').length === 0 && <p className="text-center text-gray-500 py-8">暂无待审核的头像申请</p>}
            </div>
          </div>
        )}

        {/* 管理员变更审批面板（仅超管） */}
        {activeTab === 'admin-requests' && user.username === '371920029173' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">管理员变更审批</h2>
            <div className="space-y-4">
              {adminChangeRequests.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">申请人：{req.requester_id}</p>
                    <p className="text-sm text-gray-700">目标用户：{req.target_user_id}</p>
                    <p className="text-sm text-gray-700">操作：{req.action}</p>
                    <p className="text-sm text-gray-500">状态：{req.status}</p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleAdminChangeApprove(req.id, true)} className="btn-primary flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> 批准
                      </button>
                      <button onClick={() => handleAdminChangeApprove(req.id, false)} className="btn-secondary flex items-center">
                        <XCircle className="w-4 h-4 mr-1" /> 拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {adminChangeRequests.length === 0 && <p className="text-center text-gray-500 py-8">暂无管理员变更申请</p>}
            </div>
          </div>
        )}

        {/* 文件审核 */}
        {activeTab === 'files' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">文件审核</h2>
            <div className="space-y-4">
              {files.filter(f => !f.is_approved).map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{file.original_name}</h3>
                      <p className="text-sm text-gray-500">
                         作者：{fileAuthors[file.user_id] || 'Unknown'} | 
                         大小：{Math.round(file.file_size / 1024)}KB | 
                         类型：{getFileType(file.original_name)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(`/file/${file.id}`, '_blank')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        预览
                      </button>
                      <button
                        onClick={() => handleFileApproval(file.id, true)}
                        className="btn-primary flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        通过
                      </button>
                      <button
                        onClick={() => handleFileApproval(file.id, false)}
                        className="btn-secondary flex items-center"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {files.filter(f => !f.is_approved).length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无待审核的文件</p>
              )}
            </div>
          </div>
        )}

        {/* 公告管理 */}
        {activeTab === 'announcements' && user.is_admin && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">公告管理</h2>
              <button 
                onClick={() => setShowAnnouncementForm(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                发布公告
              </button>
            </div>
            
            {/* 发布/编辑公告表单 */}
            {(showAnnouncementForm || editingAnnouncement) && (
              <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{editingAnnouncement ? '编辑公告' : '发布新公告'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
                    <input
                      type="text"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入公告标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
                    <textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入公告内容"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">公告类型</label>
                      <select
                        value={newAnnouncement.type}
                        onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="info">信息</option>
                        <option value="warning">警告</option>
                        <option value="success">成功</option>
                        <option value="error">错误</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={newAnnouncement.isActive}
                        onChange={(e) => setNewAnnouncement(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="mr-2"
                      />
                      <label htmlFor="isActive" className="text-sm text-gray-700">立即发布</label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {editingAnnouncement ? (
                      <>
                        <button
                          onClick={handleUpdateAnnouncement}
                          disabled={!newAnnouncement.title || !newAnnouncement.content}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          保存修改
                        </button>
                        <button
                          onClick={() => {
                            setEditingAnnouncement(null)
                            setShowAnnouncementForm(false)
                            setNewAnnouncement({ title: '', content: '', type: 'info', isActive: true })
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handlePublishAnnouncement}
                          disabled={!newAnnouncement.title || !newAnnouncement.content}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          发布公告
                        </button>
                        <button
                          onClick={() => {
                            setShowAnnouncementForm(false)
                            setNewAnnouncement({ title: '', content: '', type: 'info', isActive: true })
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          取消
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>发布者：{announcement.created_by}</span>
                        <span>发布时间：{new Date(announcement.created_at).toLocaleDateString('zh-CN')}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {announcement.is_active ? '已发布' : '已下线'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditAnnouncement(announcement)}
                        className="btn-secondary flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="btn-secondary text-red-600 hover:text-red-700 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无公告</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 