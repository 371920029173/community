'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import { SidebarAd } from '@/components/ads/AdBanner'
import { 
  Upload, 
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  X,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  blob?: File
}

export default function UploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    const newFiles: FileItem[] = Array.from(selectedFiles).map((file, index) => ({
      id: Date.now() + index.toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading',
      blob: file
    }))

    setFiles(prev => [...prev, ...newFiles])
    toast.success(`已选择 ${selectedFiles.length} 个文件`)
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const cancelUpload = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    setIsUploading(false)
    setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'error', progress: 0 } : f))
    toast.error('上传已取消')
  }

  const startUpload = async () => {
    if (files.length === 0) {
      toast.error('请先选择文件')
      return
    }

    if (!user) {
      toast.error('请先登录')
      return
    }

    setIsUploading(true)
    const controller = new AbortController()
    setAbortController(controller)

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      if (item.status !== 'uploading' || !item.blob) continue

      // 检查是否已取消
      if (controller.signal.aborted) {
        break
      }

      try {
        // 由于我们用表单直传，无法获得原生上传进度，这里做轻量进度动画
        const tick = setInterval(() => {
          if (controller.signal.aborted) {
            clearInterval(tick)
            return
          }
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: Math.min(95, (f.progress || 0) + 5) } : f))
        }, 150)

        const fd = new FormData()
        fd.append('file', item.blob)
        fd.append('userId', user.id)

        // 获取认证token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast.error('会话已过期，请重新登录')
          clearInterval(tick)
          return
        }

        const res = await fetch('/api/drive/upload', { 
          method: 'POST', 
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: fd,
          signal: controller.signal
        })
        clearInterval(tick)

        if (controller.signal.aborted) {
          break
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', progress: 0 } : f))
          toast.error(err.error || `上传失败：${item.name}`)
          continue
        }

        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f))
      } catch (e: any) {
        if (e.name === 'AbortError') {
          // 上传被取消，不需要显示错误
          break
        }
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', progress: 0 } : f))
        toast.error(`上传失败：${item.name}`)
      }
    }

    setIsUploading(false)
    setAbortController(null)
    toast.success('上传完成，已保存至云盘。前往“我的云盘”可查看与管理。', { duration: 4000 })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {/* 页面标题 */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">上传文件</h1>
                  <p className="text-gray-600">上传文件到您的云盘</p>
                </div>
              </div>
            </div>

            {/* 文件选择区域 */}
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center mb-6 hover:border-blue-400 transition-colors">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择文件上传</h3>
              <p className="text-gray-500 mb-6">支持图片、视频、音频、文档、压缩包等多种格式</p>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.js,.py,.java,.cpp,.c,.html,.css"
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
                  选择文件
                </span>
              </label>
              
              <p className="text-sm text-gray-400 mt-4">
                文件大小仅受您的可用空间限制 • 支持拖拽上传
              </p>
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">待上传文件</h3>
                  <div className="flex gap-2">
                    {isUploading && (
                      <button
                        onClick={cancelUpload}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        取消上传
                      </button>
                    )}
                    <button
                      onClick={startUpload}
                      disabled={isUploading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? '上传中...' : '开始上传'}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                          <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* 进度条 */}
                        <div className="w-32">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{file.progress}%</span>
                        </div>
                        
                        {/* 状态图标 */}
                        {file.status === 'success' && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        
                        {/* 删除按钮 */}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            <SidebarAd />
          </div>
        </div>
      </main>
    </div>
  )
} 