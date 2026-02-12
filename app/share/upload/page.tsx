'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import { 
  Upload, 
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  X,
  Check,
  AlertCircle,
  Tag,
  Plus,
  Folder
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { runWithConcurrency } from '@/lib/uploadUtils'

interface TagItem {
  id: string
  name: string
}

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  /** 相对路径，用于文件夹上传 */
  relativePath?: string
}

export default function ShareUploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const filesRef = useRef<Map<string, File>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({})
  const [existingTags, setExistingTags] = useState<TagItem[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetch('/api/files/tags')
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setExistingTags(d.data) })
      .catch(() => {})
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    const maxSize = 50 * 1024 * 1024 // 50MB（Supabase 免费版限制）
    const oversizedFiles = Array.from(selectedFiles).filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      toast.error(`文件 ${oversizedFiles[0].name} 超过 50MB 限制`)
      return
    }

    const newFiles: FileItem[] = Array.from(selectedFiles).map((file, index) => {
      const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || ''
      const id = Date.now() + index.toString()
      filesRef.current.set(id, file)
      return {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading' as const,
        ...(webkitPath && { relativePath: webkitPath })
      }
    })

    setFiles(prev => [...prev, ...newFiles])
    const isFolder = newFiles.some(f => f.relativePath)
    toast.success(isFolder ? `已选择文件夹，共 ${selectedFiles.length} 个文件` : `已选择 ${selectedFiles.length} 个文件`)
  }

  const addTag = (name: string) => {
    const n = name.trim()
    if (!n || selectedTags.length >= 10) return
    if (selectedTags.includes(n)) return
    setSelectedTags(prev => [...prev, n])
    setTagInput('')
  }

  const removeTag = (name: string) => {
    setSelectedTags(prev => prev.filter(t => t !== name))
  }

  const removeFile = (fileId: string) => {
    filesRef.current.delete(fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setDescriptions(prev => {
      const newDescriptions = { ...prev }
      delete newDescriptions[fileId]
      return newDescriptions
    })
  }

  const updateDescription = (fileId: string, description: string) => {
    setDescriptions(prev => ({
      ...prev,
      [fileId]: description
    }))
  }

  const startUpload = async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }

    if (files.length === 0) {
      toast.error('请先选择文件')
      return
    }
    if (selectedTags.length < 1 || selectedTags.length > 10) {
      toast.error('请选择或填写 1～10 个类别')
      return
    }

    setIsUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('请先登录')
      setIsUploading(false)
      return
    }

    const isFolderUpload = files.some(f => f.relativePath)
    let pathToFolderId: Record<string, string> = {}
    let rootFolderId: string | null = null

    if (isFolderUpload) {
      const paths = new Set<string>()
      for (const f of files) {
        if (f.relativePath) {
          const dir = f.relativePath.replace(/\/[^/]+$/, '')
          if (dir) paths.add(dir)
          else paths.add('') // 根目录文件，用空字符串表示
        }
      }
      const allPaths = new Set<string>()
      for (const p of Array.from(paths)) {
        if (p) {
          const parts = p.split('/').filter(Boolean)
          for (let i = 1; i <= parts.length; i++) allPaths.add(parts.slice(0, i).join('/'))
        }
      }
      const sortedPaths = Array.from(allPaths).sort((a, b) => a.split('/').length - b.split('/').length)
      for (const p of sortedPaths) {
        const parts = p.split('/').filter(Boolean)
        const parentPath = parts.slice(0, -1).join('/')
        const parentId = parentPath ? pathToFolderId[parentPath] : null
        const res = await fetch('/api/share/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ name: parts[parts.length - 1], parentId })
        })
        const data = await res.json()
        if (!data.success || !data.folder) {
          toast.error('创建文件夹失败')
          setIsUploading(false)
          return
        }
        pathToFolderId[p] = data.folder.id
        if (!rootFolderId) rootFolderId = data.folder.id
      }
    }

    const toUpload = files.filter(f => f.status === 'uploading')
    let successCount = 0
    try {
      await runWithConcurrency(toUpload, 4, async (file) => {
        try {
          const actualFile = filesRef.current.get(file.id) ?? await getFileFromFileItem(file, !!file.relativePath)
          if (!actualFile || actualFile.size === 0) {
            throw new Error('无法获取文件内容，请重新选择')
          }
          const formData = new FormData()
          formData.append('file', actualFile)
          formData.append('userId', user.id)
          formData.append('description', descriptions[file.id] || '')
          formData.append('isPublic', 'true')
          formData.append('tags', JSON.stringify(selectedTags))
          if (file.relativePath) {
            const dir = file.relativePath.replace(/\/[^/]+$/, '')
            const folderId = dir ? pathToFolderId[dir] : rootFolderId
            if (folderId) formData.append('folderId', folderId)
          } else if (rootFolderId) formData.append('folderId', rootFolderId)
          setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, progress: 10 } : f)))
          const response = await fetch('/api/upload', { method: 'POST', body: formData })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || '上传失败')
          }
          successCount++
          setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, status: 'success', progress: 100 } : f)))
          toast.success(`${file.name} 上传成功，已提交审核。`, { duration: 3000 })
        } catch (error: any) {
          setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, status: 'error', error: error.message || '上传失败' } : f)))
          toast.error(`${file.name} 上传失败: ${error.message}`)
        }
      })
    } catch (e: any) {
      toast.error(e?.message || '上传过程出错')
    } finally {
      setIsUploading(false)
    }
    if (successCount > 0) {
      if (isFolderUpload && rootFolderId) {
        toast.success(`成功上传 ${successCount} 个文件！分享链接：${typeof window !== 'undefined' ? window.location.origin : ''}/file/${rootFolderId}`, { duration: 6000 })
      } else {
        toast.success(`成功上传 ${successCount} 个文件！`)
      }
    }
  }

  // 从 FileItem 获取真实 File 对象（优先 filesRef，回退到对应 input）
  const getFileFromFileItem = async (fileItem: FileItem, fromFolder: boolean): Promise<File> => {
    const input = document.getElementById(fromFolder ? 'folder-upload' : 'file-upload') as HTMLInputElement
    if (input?.files) {
      for (let i = 0; i < input.files.length; i++) {
        const f = input.files[i]
        if (f.name === fileItem.name && f.size === fileItem.size) return f
      }
    }
    return new File([], fileItem.name, { type: fileItem.type })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />
    if (fileType.startsWith('video/')) return <Video className="w-6 h-6 text-red-500" />
    if (fileType.startsWith('audio/')) return <Music className="w-6 h-6 text-green-500" />
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-6 h-6 text-purple-500" />
    if (fileType.includes('javascript') || fileType.includes('python') || fileType.includes('java')) return <Code className="w-6 h-6 text-indigo-500" />
    return <FileText className="w-6 h-6 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />
      case 'error':
        return <X className="w-5 h-5 text-red-500" />
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />
      default:
        return <Upload className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* 页面标题 */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">分享文件</h1>
                    <p className="text-gray-600">上传文件到公开分享平台，让更多人发现和使用</p>
                  </div>
                </div>
              </div>

              {/* 类别选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" /> 类别（必选，1～10 个）
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))}
                  placeholder="输入新类别后回车"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" /> 添加
                </button>
                {existingTags.length > 0 && (
                  <>
                    <span className="text-gray-500 text-sm">或选择已有：</span>
                    {existingTags.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addTag(t.name)}
                        disabled={selectedTags.includes(t.name) || selectedTags.length >= 10}
                        className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* 重要提示 */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">文件分享说明</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      这里上传的文件将公开分享给所有用户，请确保文件内容合法且适合公开。
                      文件大小限制为 50MB，上传后需要管理员审核才能公开显示。
                    </p>
                </div>
              </div>
            </div>

            {/* 文件选择区域 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择要分享的文件或文件夹
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                    id="file-upload"
                    accept="image/*,video/*,audio/*,application/*,text/*"
                  />
                <input
                  type="file"
                  multiple
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="folder-upload"
                />
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-900">选择文件</span>
                    </label>
                    <span className="text-gray-400">或</span>
                    <label htmlFor="folder-upload" className="cursor-pointer flex flex-col items-center">
                      <Folder className="w-12 h-12 text-amber-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">选择文件夹</span>
                    </label>
                  </div>
                    <span className="text-sm text-gray-500 mt-2 block">
                      支持图片、视频、音频、文档、压缩包等多种格式，单个文件最大 50MB，可上传整个文件夹保留结构
                    </span>
                </div>
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">待上传文件</h3>
                  <div className="space-y-3">
                  {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {file.type}
                            </p>
                          </div>
                        </div>

                        {/* 文件描述输入 */}
                        <div className="flex-1 mx-4">
                          <input
                            type="text"
                            placeholder="添加文件描述（可选）"
                            value={descriptions[file.id] || ''}
                            onChange={(e) => updateDescription(file.id, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      
                        {/* 状态和进度 */}
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(file.status)}
                            {file.status === 'uploading' && (
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                            )}
                        </div>
                        
                          {file.status === 'error' && (
                            <span className="text-xs text-red-600 max-w-32 truncate">
                              {file.error}
                            </span>
                        )}
                        
                        <button
                          onClick={() => removeFile(file.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            disabled={file.status === 'uploading'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* 上传按钮 */}
              {files.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={startUpload}
                    disabled={isUploading || files.every(f => f.status === 'success')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>上传中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>开始分享</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
          </div>
        </div>
      </div>
    </div>
  )
} 