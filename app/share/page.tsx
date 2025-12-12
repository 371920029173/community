'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
// import { SidebarAd } from '@/components/ads/AdBanner' // 已移除，仅保留主页广告
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  Code,
  Download,
  Share2,
  Eye,
  Heart,
  MessageSquare,
  Search,
  Filter,
  Grid,
  List,
  AlertCircle,
  Edit3,
  Trash2,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FileItem {
  id: string
  original_name: string
  file_type: string
  file_size: number
  created_at: string
  description?: string
  author_name: string
  user_id: string
  likes_count: number
  comments_count: number
  download_count: number  // 统一使用单数形式，与数据库字段一致
  file_url: string
  is_approved: boolean
}

export default function SharePage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [onlyMine, setOnlyMine] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [editForm, setEditForm] = useState({
    original_name: '',
    description: ''
  })

  // 获取公开文件列表
  useEffect(() => {
    fetchPublicFiles()
  }, [])

  const fetchPublicFiles = async () => {
    try {
      console.log('开始获取公开文件列表...')
      setIsLoading(true)
      const response = await fetch('/api/files/public', {
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('获取到的文件数据:', data)
        console.log('文件数量:', data.files?.length || 0)
        setFiles(data.files || [])
        console.log('文件列表已更新')
      } else {
        console.error('获取公开文件失败')
        setFiles([])
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
      toast.error('获取文件列表失败')
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') return <Image className="w-8 h-8 text-blue-500" />
    if (fileType === 'video') return <Video className="w-8 h-8 text-red-500" />
    if (fileType === 'audio') return <Music className="w-8 h-8 text-green-500" />
    if (fileType === 'document') return <FileText className="w-8 h-8 text-yellow-500" />
    if (fileType === 'archive') return <Archive className="w-8 h-8 text-purple-500" />
    if (fileType === 'code') return <Code className="w-8 h-8 text-indigo-500" />
    return <FileText className="w-8 h-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  }

  const handleDownload = (file: FileItem) => {
    if (file.file_url) {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = file.file_url
      link.download = file.original_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    toast.success(`开始下载 ${file.original_name}`)
    } else {
      toast.error('下载链接不可用')
    }
  }

  const handleLike = (file: FileItem) => {
    toast.success('点赞功能即将上线！')
  }

  const handleComment = (file: FileItem) => {
    toast.success('评论功能即将上线！')
  }

  const handleEditFile = (file: FileItem) => {
    setEditingFile(file)
    setEditForm({
      original_name: file.original_name,
      description: file.description || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingFile || !user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/files/${editingFile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          original_name: editForm.original_name,
          description: editForm.description
        })
      })

      const result = await response.json()
      console.log('编辑响应:', result)

      if (response.ok) {
        toast.success('文件编辑成功')
        setEditingFile(null)
        fetchPublicFiles() // 刷新列表
      } else {
        toast.error(result.error || '编辑失败')
      }
    } catch (error) {
      console.error('编辑文件错误:', error)
      toast.error('编辑文件失败')
    }
  }

  const handleCancelEdit = () => {
    setEditingFile(null)
    setEditForm({ original_name: '', description: '' })
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!user || !confirm('确定要删除这个文件吗？此操作不可撤销。')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('删除响应状态:', response.status)
      const result = await response.json()
      console.log('删除响应结果:', result)

      if (response.ok) {
        toast.success('文件删除成功')
        console.log('删除成功，正在刷新文件列表...')
        await fetchPublicFiles() // 刷新列表
        console.log('文件列表已刷新')
      } else {
        toast.error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除文件错误:', error)
      toast.error('删除文件失败')
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = filterType === 'all' || file.file_type === filterType
    const mineFilter = !onlyMine || (user ? file.user_id === user.id : false)
    const isApproved = file.is_approved
    return matchesSearch && matchesType && isApproved && mineFilter
  })

  const getFilterOptions = () => {
    const types = ['all', 'image', 'video', 'audio', 'document', 'archive', 'code']
    const typeLabels = {
      'all': '全部',
      'image': '图片',
      'video': '视频',
      'audio': '音频',
      'document': '文档',
      'archive': '压缩包',
      'code': '代码'
    }
    
    return types.map(type => ({
      value: type,
      label: typeLabels[type as keyof typeof typeLabels]
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      {/* 编辑文件模态框 */}
      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">编辑文件</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件名
                </label>
                <input
                  type="text"
                  value={editForm.original_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, original_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {/* 页面标题 */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">文件分享</h1>
              <p className="text-gray-600">发现和下载其他用户分享的优质文件资源</p>
            </div>

            {/* 搜索和筛选 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 搜索框 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="搜索文件名或描述..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 文件类型筛选 */}
                <div className="flex-shrink-0">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getFilterOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 视图切换 */}
                <div className="flex-shrink-0">
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOnlyMine(v => !v)}
                      className={`px-3 py-2 flex items-center gap-1 transition-all duration-200 ${onlyMine ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-sm'}`}
                      title="只看我的文件"
                    >
                      <User className="w-4 h-4" />
                      我的
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 文件列表 */}
            {filteredFiles.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || filterType !== 'all' ? '没有找到匹配的文件' : '暂无分享文件'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || filterType !== 'all' 
                      ? '尝试调整搜索条件或筛选器'
                      : '成为第一个分享文件的人吧！'
                    }
                  </p>
                  {!searchQuery && filterType === 'all' && (
                    <a
                      href="/share/upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      分享文件
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${
                      viewMode === 'list' ? 'flex items-center p-4' : 'p-4'
                    }`}
                  >
                    {/* 文件图标 */}
                    <div className={`flex items-center ${viewMode === 'list' ? 'mr-4' : 'mb-4'}`}>
                        {getFileIcon(file.file_type)}
                      <div className={`${viewMode === 'list' ? 'ml-3' : 'ml-2'}`}>
                          <h3 className="font-medium text-gray-900 truncate">{file.original_name}</h3>
                          <p className="text-sm text-gray-500">
                          {formatFileSize(file.file_size)} • {file.file_type}
                          </p>
                      </div>
                    </div>

                    {/* 文件信息 */}
                    <div className={`${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}>
                      {file.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{file.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>分享者: {file.author_name || '未知用户'}</span>
                        <span>{formatDate(file.created_at)}</span>
                    </div>
                    
                    {/* 统计信息 */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {file.download_count ?? 0}
                        </span>
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {file.likes_count || 0}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {file.comments_count || 0}
                        </span>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex space-x-2">
                      {onlyMine && user && file.user_id === user.id ? (
                        <>
                          <button
                            onClick={() => handleEditFile(file)}
                            className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-600 hover:scale-105 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            title="编辑文件"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 hover:scale-105 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            title="删除文件"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDownload(file)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            下载
                          </button>
                          <button
                            onClick={() => handleLike(file)}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:scale-105 transition-all duration-200"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleComment(file)}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:scale-105 transition-all duration-200"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页信息 */}
            {filteredFiles.length > 0 && (
              <div className="mt-8 text-center text-sm text-gray-500">
                共找到 {filteredFiles.length} 个文件
              </div>
            )}
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            {/* 广告已移除，仅保留主页广告 */}
            
            {/* 分享提示 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">分享你的文件</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    有优质文件想要分享给大家？上传到文件分享平台，让更多人受益！
                  </p>
                  <a
                    href="/share/upload"
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    立即分享
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 