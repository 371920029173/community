'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { 
  Users, 
  HardDrive, 
  Settings, 
  Plus, 
  Minus, 
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Crown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getFriendlyErrorMessage } from '@/lib/utils'

interface User {
  id: string
  username: string
  nickname: string | null
  storage_limit: number
  storage_used: number
  created_at: string
}

interface StorageLog {
  id: string
  admin: { username: string; nickname: string | null }
  target_user: { username: string; nickname: string | null }
  action: string
  old_limit: number
  new_limit: number
  reason: string | null
  created_at: string
}

interface StorageRequest {
  id: string
  requester: { username: string; nickname: string | null }
  target_user: { username: string; nickname: string | null }
  old_limit: number
  new_limit: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: { username: string; nickname: string | null } | null
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
}

export default function StorageManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<StorageLog[]>([])
  const [requests, setRequests] = useState<StorageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [reason, setReason] = useState('')
  const [updating, setUpdating] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewingRequest, setReviewingRequest] = useState<StorageRequest | null>(null)

  useEffect(() => {
    if (user?.is_admin) {
      fetchStorageInfo()
      fetchStorageRequests()
      // 检查是否是超级管理员
      setIsSuperAdmin(user.username === '371920029173')
    }
  }, [user])

  const fetchStorageInfo = async () => {
    try {
      console.log('正在获取存储信息...', user?.id)
      const response = await fetch(`/api/admin/storage?adminId=${user?.id}`)
      const data = await response.json()
      
      console.log('存储信息API响应:', data)
      
      if (data.success) {
        setUsers(data.data.users)
        setLogs(data.data.logs)
        console.log('设置用户数据:', data.data.users)
      } else {
        toast.error(getFriendlyErrorMessage(data.error) || '获取信息失败')
      }
    } catch (error) {
      console.error('获取存储信息失败:', error)
      toast.error(getFriendlyErrorMessage(error) || '网络连接失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  const fetchStorageRequests = async () => {
    try {
      const response = await fetch(`/api/storage-requests?adminId=${user?.id}`)
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.data || [])
      } else {
        console.error('获取审核请求失败:', data.error)
      }
    } catch (error) {
      console.error('获取审核请求失败:', error)
    }
  }

  const updateStorageLimit = async () => {
    if (!selectedUser || !newLimit || !user) return

    const limit = parseInt(newLimit) * 1024 * 1024 * 1024 // 转换为字节
    if (limit < selectedUser.storage_used) {
      toast.error('New storage limit cannot be less than used storage space')
      return
    }

    setUpdating(true)
    try {
      // 如果是超级管理员修改自己的存储空间，使用特殊API
      if (isSuperAdmin && selectedUser.username === '371920029173') {
        const response = await fetch('/api/super-admin/storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newLimit: limit,
            reason: reason || '超级管理员自己调整存储空间'
          })
        })

        const data = await response.json()
        
        if (data.success) {
          toast.success('存储空间修改成功')
          setNewLimit('')
          setReason('')
          setSelectedUser(null)
          fetchStorageInfo() // 刷新数据
        } else {
          toast.error(data.error || 'Modification failed')
        }
      } else {
        // 普通管理员修改其他用户的存储空间，需要提交审核请求
        const response = await fetch('/api/storage-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adminId: user.id,
            targetUserId: selectedUser.id,
            newLimit: limit,
            reason: reason || '管理员申请修改存储空间'
          })
        })

        const data = await response.json()
        
        if (data.success) {
          toast.success('存储空间修改请求已提交，等待超级管理员审核')
          setNewLimit('')
          setReason('')
          setSelectedUser(null)
          fetchStorageRequests() // 刷新审核请求列表
        } else {
          toast.error(getFriendlyErrorMessage(data.error) || '提交申请失败')
        }
      }
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error) || '网络连接失败，请检查网络后重试')
    } finally {
      setUpdating(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const handleReviewRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!user) return

    try {
      const response = await fetch('/api/storage-requests/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user.id,
          requestId,
          action,
          comment: reviewComment || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        setReviewingRequest(null)
        setReviewComment('')
        fetchStorageRequests()
        fetchStorageInfo()
      } else {
        toast.error(getFriendlyErrorMessage(data.error) || '审核失败')
      }
    } catch (error) {
      console.error('审核请求失败:', error)
      toast.error(getFriendlyErrorMessage(error) || '审核失败，请重试')
    }
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">访问被拒绝</h1>
          <p className="text-gray-600">只有管理员可以访问此页面</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">存储空间管理</h1>
              <p className="text-gray-600">管理用户的云盘存储空间</p>
            </div>
            {isSuperAdmin && (
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowRequests(!showRequests)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    showRequests 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>审核请求</span>
                  {requests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {requests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 用户列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  用户存储情况
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        已使用
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        限制
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        使用率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => {
                      const usagePercent = (user.storage_used / user.storage_limit) * 100
                      const isNearLimit = usagePercent > 80
                      
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {user.nickname || user.username}
                                {user.username === '371920029173' && (
                                  <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white shadow-lg animate-pulse">
                                    <Crown className="w-3 h-3 mr-1" />
                                    超级管理员
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{user.username}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatBytes(user.storage_used)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatBytes(user.storage_limit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    isNearLimit ? 'bg-red-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm ${
                                isNearLimit ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {usagePercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              修改
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 操作面板 */}
          <div className="space-y-6">
            {/* 修改存储空间 */}
            {selectedUser && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  修改存储空间
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用户: {selectedUser.nickname || selectedUser.username}
                    </label>
                    <div className="text-sm text-gray-500">
                      当前限制: {formatBytes(selectedUser.storage_limit)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新存储限制 (GB)
                    </label>
                    <input
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入新的存储限制"
                      min={Math.ceil(selectedUser.storage_used / (1024 * 1024 * 1024))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      修改原因 (可选)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="请输入修改原因..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={updateStorageLimit}
                      disabled={updating || !newLimit}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updating ? '更新中...' : '确认修改'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(null)
                        setNewLimit('')
                        setReason('')
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 操作日志 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <History className="w-5 h-5 mr-2" />
                操作日志
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">暂无操作记录</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {log.admin.nickname || log.admin.username}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        修改 {log.target_user.nickname || log.target_user.username} 的存储空间
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatBytes(log.old_limit)} → {formatBytes(log.new_limit)}
                        {log.reason && ` (${log.reason})`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 审核请求列表 */}
            {showRequests && isSuperAdmin && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  存储空间修改审核
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-sm">暂无待审核请求</p>
                  ) : (
                    requests.map((request) => (
                      <div key={request.id} className={`border rounded-lg p-4 ${
                        request.status === 'pending' ? 'border-yellow-200 bg-yellow-50' :
                        request.status === 'approved' ? 'border-green-200 bg-green-50' :
                        'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {request.requester.nickname || request.requester.username}
                            </span>
                            <span className="text-gray-500">申请修改</span>
                            <span className="font-medium text-gray-900">
                              {request.target_user.nickname || request.target_user.username}
                            </span>
                            <span className="text-gray-500">的存储空间</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {request.status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="w-3 h-3 mr-1" />
                                待审核
                              </span>
                            )}
                            {request.status === 'approved' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                已通过
                              </span>
                            )}
                            {request.status === 'rejected' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                已拒绝
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {formatBytes(request.old_limit)} → {formatBytes(request.new_limit)}
                        </div>
                        {request.reason && (
                          <div className="text-sm text-gray-500 mb-2">
                            申请理由：{request.reason}
                          </div>
                        )}
                        {request.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setReviewingRequest(request)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              审核
                            </button>
                            <span className="text-xs text-gray-500">
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                        )}
                        {request.status !== 'pending' && request.reviewed_by && (
                          <div className="text-xs text-gray-500">
                            审核人：{request.reviewed_by.nickname || request.reviewed_by.username} | 
                            {formatDate(request.reviewed_at || '')}
                            {request.review_comment && ` | ${request.review_comment}`}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 审核对话框 */}
        {reviewingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">审核存储空间修改请求</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{reviewingRequest.requester.nickname || reviewingRequest.requester.username}</span>
                    申请修改
                    <span className="font-medium">{reviewingRequest.target_user.nickname || reviewingRequest.target_user.username}</span>
                    的存储空间
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatBytes(reviewingRequest.old_limit)} → {formatBytes(reviewingRequest.new_limit)}
                  </p>
                  {reviewingRequest.reason && (
                    <p className="text-sm text-gray-500 mt-1">
                      申请理由：{reviewingRequest.reason}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    审核备注
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="请输入审核备注（可选）"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleReviewRequest(reviewingRequest.id, 'approved')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReviewRequest(reviewingRequest.id, 'rejected')}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => {
                      setReviewingRequest(null)
                      setReviewComment('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 