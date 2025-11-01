'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Image, Video, Music, FileText, Globe, Lock } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'
import { getFriendlyErrorMessage } from '@/lib/utils'

interface FileUploadProps {
  onUploadSuccess?: (file: any) => void
  onClose?: () => void
  defaultPublic?: boolean
}

export default function FileUpload({ onUploadSuccess, onClose, defaultPublic = false }: FileUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isPublic, setIsPublic] = useState(defaultPublic)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 过滤掉 0B 文件
    const validFiles = acceptedFiles.filter(file => {
      if (file.size === 0) {
        toast.error(`文件 ${file.name} 是空文件，已跳过`)
        return false
      }
      return true
    })
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv'],
      'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  })

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />
    if (file.type.startsWith('audio/')) return <Music className="w-5 h-5 text-orange-500" />
    if (file.type.startsWith('text/') || file.type.includes('pdf') || file.type.includes('word')) {
      return <FileText className="w-5 h-5 text-blue-500" />
    }
    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }

    if (uploadedFiles.length === 0) {
      toast.error('请选择要上传的文件')
      return
    }

    setUploading(true)

    try {
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', user.id)
        formData.append('description', description)
        formData.append('isPublic', isPublic.toString())

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error)
        }

        toast.success(`${file.name} 上传成功`)
        
        if (onUploadSuccess) {
          onUploadSuccess(result.data)
        }
      }

      // 清空表单
      setUploadedFiles([])
      setDescription('')
      
      if (onClose) {
        onClose()
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(getFriendlyErrorMessage(error) || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="card text-center">
        <div className="text-gray-500 mb-4">
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium">需要登录</h3>
          <p className="text-sm">请先登录账号才能上传文件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">上传文件</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-purple-600 font-medium">将文件拖拽到这里...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              拖拽文件到这里，或 <span className="text-purple-600 font-medium">点击选择文件</span>
            </p>
            <p className="text-sm text-gray-500">
              支持图片、视频、音频、文档等格式，最大100MB
            </p>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-3">待上传文件 ({uploadedFiles.length})</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <div className="font-medium text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传选项 */}
      <div className="mt-6 space-y-4">
        {/* 文件描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文件描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="为您的文件添加描述..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 公开设置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文件可见性
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <Lock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">私有（仅自己可见）</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700">公开（所有人可见）</span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isPublic ? '文件将显示在文件分享页面，其他用户可以下载' : '文件将保存在您的私人云盘中'}
          </p>
        </div>
      </div>

      {/* 上传按钮 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={uploading || uploadedFiles.length === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              开始上传
            </>
            )}
        </button>
      </div>
    </div>
  )
} 