'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
// import { SidebarAd } from '@/components/ads/AdBanner' // 已移除，仅保留主页广告
import { useAuth } from '@/components/providers/AuthProvider'
import { runWithConcurrency } from '@/lib/uploadUtils'
import { supabase } from '@/lib/supabase'
import { 
  Folder, File, Trash2, Download, Share2, Edit3, 
  MoreVertical, Upload, Search, Grid, List, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getFriendlyErrorMessage } from '@/lib/utils'

interface FileItem {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  created_at: string
  is_public: boolean
  folder_id?: string | null
}

interface FolderItem {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

export default function FilesPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<FolderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    limit: 0
  })
  const [isUploading, setIsUploading] = useState(false)

  // Get user files and folders (cloud drive)
  const fetchFiles = async (folderId?: string | null) => {
    if (!user) return
    const fid = folderId !== undefined ? folderId : currentFolderId
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const url = fid ? `/api/drive/user-files?folderId=${fid}` : '/api/drive/user-files'
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        const fileList = data.files || []
        const folderList = data.folders || []
        setFiles(fileList)
        setFolders(folderList)
        
        const totalSize = fileList.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0)
        setStorageInfo({
          used: totalSize,
          limit: user.storage_limit || 107374182400
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to get files:', errorData)
        toast.error(errorData.error || '获取文件失败')
      }
    } catch (error) {
      console.error('Failed to get files:', error)
      toast.error(getFriendlyErrorMessage(error) || '获取文件失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 上传单文件到云盘
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    let { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      const { data: refreshData } = await supabase.auth.refreshSession()
      if (!refreshData?.session) {
        toast.error('会话已过期，请重新登录')
        return
      }
      session = refreshData.session
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      if (currentFolderId) formData.append('folderId', currentFolderId)
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session!.access_token}` },
        body: formData
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success('文件上传成功')
        fetchFiles(currentFolderId)
      } else {
        toast.error(result.error || '上传失败')
      }
    } catch (e: any) {
      toast.error(e?.message || '上传失败')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  // Delete file (cloud drive)
  const deleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？此操作无法撤销。')) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/drive/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        toast.success('文件删除成功')
        setFiles(files.filter(f => f.id !== fileId))
        setSelectedFiles(selectedFiles.filter(id => id !== fileId))
      } else {
        const error = await response.json()
        toast.error(error.error || '删除失败')
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('删除失败')
    }
  }

  // Preview file
  const previewFile = async (file: FileItem) => {
    try {
      // 直接使用文件ID打开预览页面
      window.open(`/drive-file/${file.id}`, '_blank')
    } catch (error) {
      console.error('Error previewing file:', error)
      toast.error('预览失败，请重试')
    }
  }

  const deleteSelectedFiles = async () => {
    if (selectedFiles.length === 0 && selectedFolders.length === 0) return
    const total = selectedFiles.length + selectedFolders.length
    if (!confirm(`确定要删除选中的 ${total} 项吗？${selectedFolders.length > 0 ? '（文件夹及其内文件将被删除）' : ''}`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }

      if (selectedFiles.length > 0) {
        const res = await fetch('/api/drive/batch-delete', {
          method: 'DELETE', headers, body: JSON.stringify({ fileIds: selectedFiles })
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(getFriendlyErrorMessage(data.error) || '批量删除失败')
          return
        }
        setFiles(files.filter(f => !selectedFiles.includes(f.id)))
        setSelectedFiles([])
      }
      if (selectedFolders.length > 0) {
        const res = await fetch('/api/drive/folders/batch-delete', {
          method: 'DELETE', headers, body: JSON.stringify({ folderIds: selectedFolders })
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(getFriendlyErrorMessage(data.error) || '文件夹删除失败')
          return
        }
        setFolders(folders.filter(f => !selectedFolders.includes(f.id)))
        setSelectedFolders([])
      }
      toast.success('删除成功')
      fetchFiles(currentFolderId)
    } catch (error) {
      console.error('Batch delete error:', error)
      toast.error(getFriendlyErrorMessage(error) || '批量删除失败')
    }
  }

  // Rename file
  const startEdit = (file: FileItem) => {
    setEditingFile(file.id)
    setEditName(file.original_name)
  }

  const saveEdit = async (fileId: string) => {
    if (!editName.trim()) {
      toast.error('文件名不能为空')
      return
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch(`/api/drive/${fileId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ original_name: editName.trim() })
      })
      
      if (response.ok) {
        toast.success('重命名成功')
        setFiles(files.map(f => 
          f.id === fileId ? { ...f, original_name: editName.trim() } : f
        ))
        setEditingFile(null)
        setEditName('')
      } else {
        const error = await response.json()
        toast.error(error.error || '重命名失败')
      }
    } catch (error) {
      console.error('Rename error:', error)
      toast.error('重命名失败')
    }
  }

  const cancelEdit = () => {
    setEditingFile(null)
    setEditName('')
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId])
  }

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders(prev => prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId])
  }

  const toggleSelectAll = () => {
    const allFiles = selectedFiles.length === files.length
    const allFolders = selectedFolders.length === folders.length
    if (allFiles && allFolders && (files.length > 0 || folders.length > 0)) {
      setSelectedFiles([])
      setSelectedFolders([])
    } else {
      setSelectedFiles(files.map(f => f.id))
      setSelectedFolders(folders.map(f => f.id))
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.startsWith('text/')) return '📄'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙'
    return '📁'
  }

  // Filter files
  const filteredFiles = files.filter(file =>
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const navigateToFolder = (folderId: string | null, folder?: FolderItem) => {
    setCurrentFolderId(folderId)
    if (folderId && folder) {
      setFolderPath(prev => [...prev, folder])
    } else {
      setFolderPath([])
    }
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null)
      setFolderPath([])
    } else {
      setCurrentFolderId(folderPath[index].id)
      setFolderPath(prev => prev.slice(0, index + 1))
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return
    setCreatingFolder(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('会话已过期'); return }
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('文件夹创建成功')
        setNewFolderName('')
        fetchFiles(currentFolderId)
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch (e) {
      toast.error('创建失败')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || !user) return
    const files = Array.from(fileList) as File[]
    if (files.length === 0) return

    const session = (await supabase.auth.getSession()).data.session
    if (!session) { toast.error('会话已过期'); return }

    const pathToFolderId = new Map<string, string>()
    pathToFolderId.set('', currentFolderId || '')

    const ensureFolder = async (path: string): Promise<string | null> => {
      if (!path) return currentFolderId
      const cached = pathToFolderId.get(path)
      if (cached) return cached || null
      const parts = path.split('/').filter(Boolean)
      let parentId = currentFolderId
      let built = ''
      for (const part of parts) {
        built = built ? `${built}/${part}` : part
        let fid = pathToFolderId.get(built)
        if (!fid) {
          const res = await fetch('/api/drive/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ name: part, parentId })
          })
          const data = await res.json()
          if (!data.success || !data.folder?.id) return null
          const newFid = data.folder.id as string
          fid = newFid
          pathToFolderId.set(built, newFid)
          parentId = newFid
        }
        parentId = fid!
      }
      return parentId
    }

    const token = session.access_token
    const items: { file: File; folderId: string | null }[] = []
    for (const file of files) {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const dir = rel.includes('/') ? rel.substring(0, rel.lastIndexOf('/')) : ''
      const folderId = await ensureFolder(dir)
      items.push({ file, folderId })
    }

    setIsUploading(true)
    try {
      await runWithConcurrency(items, 4, async ({ file, folderId }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', user.id)
        if (folderId) formData.append('folderId', folderId)
        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || '上传失败')
      })
      toast.success(`已上传 ${items.length} 个文件`)
      fetchFiles(currentFolderId)
    } catch (e: any) {
      toast.error(e?.message || '上传失败')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  useEffect(() => {
    if (user) fetchFiles(currentFolderId)
  }, [user, currentFolderId])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h1>
            <p className="text-gray-600">需要登录才能访问云盘</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content area */}
          <div className="flex-1">
            {/* Page title and action bar */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">我的云盘</h1>
                  <p className="text-gray-600 mt-1">管理您的个人文件</p>
                  <div className="mt-2 text-sm text-gray-500">
                    可用空间: <span className="font-medium text-blue-600">
                      {((storageInfo.limit - storageInfo.used) / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                    <span className="ml-2 text-gray-400">
                      (已使用 {(storageInfo.used / 1024 / 1024 / 1024).toFixed(2)} GB)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 cursor-pointer">
                    <Folder className="w-4 h-4" />
                    {isUploading ? '上传中...' : '上传文件夹'}
                    <input
                      type="file"
                      {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                      multiple
                      onChange={handleFolderUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {isUploading ? '上传中...' : '上传文件'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="新建文件夹"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-32"
                      onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                    />
                    <button
                      onClick={createFolder}
                      disabled={creatingFolder || !newFolderName.trim()}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {creatingFolder ? '...' : '新建'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Breadcrumb */}
              {(currentFolderId || folderPath.length > 0) && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                  <button
                    onClick={() => navigateToBreadcrumb(-1)}
                    className="hover:text-blue-600"
                  >
                    根目录
                  </button>
                  {folderPath.map((f, i) => (
                    <span key={f.id}>
                      <span className="mx-1">/</span>
                      <button
                        onClick={() => navigateToBreadcrumb(i)}
                        className="hover:text-blue-600"
                      >
                        {f.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Search and view toggle */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索文件..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Batch operation bar */}
            {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800">
                    已选择 {selectedFiles.length + selectedFolders.length} 项
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={deleteSelectedFiles}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除选中
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 文件列表 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">加载中...</p>
                </div>
              ) : (filteredFiles.length === 0 && folders.length === 0) ? (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Folder className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">暂无文件</h3>
                  {!searchQuery ? (
                    <>
                      <p className="text-gray-600 mb-6">开始上传您的第一个文件</p>
                      <label className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer inline-block">
                        {isUploading ? '上传中...' : '上传文件'}
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <p className="text-gray-600">没有找到匹配的文件</p>
                  )}
                </div>
                  ) : (
                <div className="p-6">
                  {/* 表头 */}
                  <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={(files.length > 0 || folders.length > 0) && selectedFiles.length === files.length && selectedFolders.length === folders.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-500">全选</span>
                  </div>

                  {/* 文件夹列表 */}
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gradient-to-br from-amber-50 to-orange-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFolders.includes(folder.id)}
                          onChange={(e) => { e.stopPropagation(); toggleFolderSelection(folder.id) }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div
                          className="flex-1 flex items-center gap-3 cursor-pointer"
                          onClick={() => navigateToFolder(folder.id, folder)}
                        >
                          <Folder className="w-8 h-8 text-amber-500" />
                          <div>
                            <p className="font-medium text-gray-900">{folder.name}</p>
                            <p className="text-sm text-gray-500">文件夹</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToFolder(folder.id, folder)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="进入"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 文件列表 */}
                  <div className="space-y-2 mt-4">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                          
                          <div className="flex-1 min-w-0">
                            {editingFile === file.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveEdit(file.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900 truncate">
                                  {file.original_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => previewFile(file)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="预览"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(file)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="重命名"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { data: { session } } = await supabase.auth.getSession()
                                if (!session) { toast.error('会话已过期，请重新登录'); return }
                                const res = await fetch(`/api/drive/${file.id}`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
                                const data = await res.json()
                                if (data.success && data.url) {
                                  window.open(data.url, '_blank')
                                } else {
                                  toast.error(data.error || '获取下载链接失败')
                                }
                              } catch (e) { toast.error('下载失败') }
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 侧边栏广告 */}
          <div className="w-80">
            {/* 广告已移除，仅保留主页广告 */}
          </div>
        </div>
      </div>
    </div>
  )
} 