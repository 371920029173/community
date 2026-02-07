'use client'

import { useState, useEffect } from 'react'
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
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

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
}

export default function ShareUploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
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

    // 检查文件大小限制（5GB）
    const maxSize = 5 * 1024 * 1024 * 1024 // 5GB
    const oversizedFiles = Array.from(selectedFiles).filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      toast.error(`文件 ${oversizedFiles[0].name} 超过5GB限制`)
      return
    }

    const newFiles: FileItem[] = Array.from(selectedFiles).map((file, index) => ({
      id: Date.now() + index.toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading'
    }))

    setFiles(prev => [...prev, ...newFiles])
    toast.success(`已选择 ${selectedFiles.length} 个文件`)
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
    setFiles(prev => prev.filter(f => f.id !== fileId))
    // 同时移除描述
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
    
    // 真实上传文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.status === 'uploading') {
        try {
          // 创建FormData
          const formData = new FormData()
          formData.append('file', await getFileFromFileItem(file))
          formData.append('userId', user.id)
          formData.append('description', descriptions[file.id] || '')
          formData.append('isPublic', 'true')
          formData.append('tags', JSON.stringify(selectedTags))

          // 更新进度
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress: 10 } : f
          ))

          // 上传文件
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '上传失败')
        }
        
        // 标记为成功
        setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
        ))
          // 可视化引导：提示待审核
          toast.success(
            `${file.name} 上传成功，已提交审核。审核通过后会在“文件分享”页面展示。`,
            { duration: 4000 }
          )
        } catch (error: any) {
          console.error('Upload error:', error)
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error', 
              error: error.message || '上传失败' 
            } : f
          ))
          toast.error(`${file.name} 上传失败: ${error.message}`)
        }
      }
    }
    
    setIsUploading(false)
    
    // 检查是否有成功上传的文件
    const successCount = files.filter(f => f.status === 'success').length
    if (successCount > 0) {
      toast.success(`成功上传 ${successCount} 个文件！`)
    }
  }

  // 从FileItem获取真实的File对象
  const getFileFromFileItem = async (fileItem: FileItem): Promise<File> => {
    // 这里需要从input中重新获取文件
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    if (input && input.files) {
      for (let i = 0; i < input.files.length; i++) {
        if (input.files[i].name === fileItem.name && input.files[i].size === fileItem.size) {
          return input.files[i]
        }
      }
    }
    
    // 如果找不到，尝试从全局文件存储获取
    // 这里可以改进为使用useRef来存储文件引用
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
                      文件大小限制为5GB，上传后需要管理员审核才能公开显示。
                    </p>
                </div>
              </div>
            </div>

            {/* 文件选择区域 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择要分享的文件
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
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <span className="text-lg font-medium text-gray-900 mb-2">
                      点击选择文件或拖拽到此处
                    </span>
                    <span className="text-sm text-gray-500">
                      支持图片、视频、音频、文档、压缩包等多种格式，单个文件最大5GB
                </span>
              </label>
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