'use client'

import { useState, useEffect } from 'react'
import { FileItem } from '@/lib/supabase'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  File, 
  User, 
  Calendar, 
  Download,
  Eye,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface FilePreviewProps {
  file: FileItem | null
  loading: boolean
  showComments?: boolean
  showLikes?: boolean
  onBack?: () => void
}

export default function FilePreview({ 
  file, 
  loading, 
  showComments = false, 
  showLikes = false,
  onBack 
}: FilePreviewProps) {
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (file) {
      const fileType = getFileType(file)
      if (fileType === 'text') {
        fetchFileContent()
      } else {
        setFileContent('')
      }
    }
  }, [file])

  const getFileUrl = (file: FileItem | null): string => {
    if (!file) return ''
    
    // 优先使用数据库中的 file_url
    if (file.file_url) {
      return file.file_url
    }
    
    // 否则从 file_path 构建 URL
    if (file.file_path) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const bucketName = 'files'
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${file.file_path}`
    }
    
    return ''
  }

  const getSafeFileUrl = (file: FileItem | null): string => {
    return getFileUrl(file) || ''
  }

  const getFileType = (file: FileItem | null): string => {
    if (!file) return 'file'
    
    // 优先使用数据库中的 file_type
    if (file.file_type) {
      return file.file_type
    }
    
    // 否则根据文件名扩展名判断
    const ext = file.original_name.toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image'
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) return 'video'
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return 'audio'
    if (['pdf'].includes(ext || '')) return 'document'
    if (['txt', 'md', 'json', 'xml', 'js', 'html', 'css'].includes(ext || '')) return 'text'
    return 'file'
  }

  const fetchFileContent = async () => {
    const fileUrl = getSafeFileUrl(file)
    if (!fileUrl || !file) return
    
    // 只对文本文档获取内容
    const fileType = getFileType(file)
    if (fileType !== 'text') {
      setFileContent('')
      return
    }
    
    setLoadingContent(true)
    try {
      const response = await fetch(fileUrl)
      if (response.ok) {
        // 尝试不同的编码方式
        const arrayBuffer = await response.arrayBuffer()
        const decoder = new TextDecoder('utf-8')
        let content = decoder.decode(arrayBuffer)
        
        // 如果解码失败，尝试其他编码
        if (content.includes('')) {
          try {
            const decoderGBK = new TextDecoder('gbk')
            content = decoderGBK.decode(arrayBuffer)
          } catch {
            // 如果还是失败，使用原始文本
            content = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer)
          }
        }
        
        setFileContent(content)
      } else {
        setFileContent('Unable to load file content')
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContent('Error loading file content')
    } finally {
      setLoadingContent(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isDocxFile = (file: FileItem | null): boolean => {
    if (!file) return false
    const fileName = file.original_name.toLowerCase()
    const mimeType = file.mime_type?.toLowerCase() || ''
    return fileName.endsWith('.docx') || 
           fileName.endsWith('.doc') || 
           mimeType.includes('word') ||
           mimeType.includes('document')
  }

  const isPdfFile = (file: FileItem | null): boolean => {
    if (!file) return false
    const fileName = file.original_name.toLowerCase()
    const mimeType = file.mime_type?.toLowerCase() || ''
    return fileName.endsWith('.pdf') || mimeType === 'application/pdf'
  }

  const renderFileContent = () => {
    if (!file) return null

    // 特殊处理 Word 文档
    if (isDocxFile(file)) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">Word 文档预览</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`, '_blank')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="在线预览"
                >
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  在线预览
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="下载文档"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  下载
                </a>
              </div>
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{file.original_name}</h3>
              <p className="text-gray-600 mb-4">Word 文档需要下载后查看，或使用在线预览功能</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`, '_blank')}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  在线预览
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  下载文档
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 特殊处理 PDF 文件
    if (isPdfFile(file)) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">PDF 文档预览</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="在新窗口打开"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  打开
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="下载PDF"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  下载
                </a>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={getSafeFileUrl(file)}
                className="w-full h-96 border-0"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )
    }

    switch (getFileType(file)) {
      case 'image':
        return (
          <div className="relative group">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Image className="w-6 h-6 mr-2" />
                    <span className="font-medium">图片预览</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                      title="在新窗口打开"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      打开
                    </button>
                    <a
                      href={getSafeFileUrl(file)}
                      download={file.original_name}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                      title="下载图片"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      下载
                    </a>
                  </div>
                </div>
              </div>
              <div className="p-6 text-center">
                <div className="relative inline-block">
                  <img 
                    src={getSafeFileUrl(file) || ''} 
                    alt={file.original_name}
                    className="max-w-full h-auto rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                    onClick={() => {
                      const url = getSafeFileUrl(file)
                      if (url) window.open(url, '_blank')
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3">
                      <Eye className="w-6 h-6 text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      case 'video':
        return (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Video className="w-6 h-6 mr-2" />
                  <span className="font-medium">视频播放</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="在新窗口打开"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    打开
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="下载视频"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    下载
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6 text-center">
              <video 
                controls 
                className="max-w-full h-auto rounded-xl shadow-lg"
                preload="metadata"
              >
                <source src={getSafeFileUrl(file)} type="video/mp4" />
                您的浏览器不支持视频播放
              </video>
              <div className="mt-4 text-sm text-gray-600">
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  {formatFileSize(file.file_size)}
                </span>
              </div>
            </div>
          </div>
        )
      case 'audio':
        return (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Music className="w-6 h-6 mr-2" />
                  <span className="font-medium">音频播放</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="在新窗口打开"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    打开
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="下载音频"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    下载
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{file.original_name}</h3>
                    <p className="text-sm text-gray-600">{formatFileSize(file.file_size)}</p>
                  </div>
                </div>
                <audio 
                  controls 
                  className="w-full"
                  preload="metadata"
                >
                  <source src={getSafeFileUrl(file)} type="audio/mpeg" />
                  您的浏览器不支持音频播放
                </audio>
              </div>
            </div>
          </div>
        )
      case 'text':
        return (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-yellow-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  <span className="font-medium">文本文档预览</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="在新窗口打开"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    打开
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="下载文档"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    下载
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loadingContent ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">加载中...</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{file.original_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatFileSize(file.file_size)}</span>
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed overflow-x-auto">
                      {fileContent || '无法加载文件内容'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      default:
        return (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <File className="w-6 h-6 mr-2" />
                  <span className="font-medium">文件预览</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="在新窗口打开"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    打开
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                    title="下载文件"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    下载
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <File className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{file.original_name}</h3>
                <p className="text-gray-600 mb-4">此文件类型暂不支持在线预览</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    打开文件
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    下载文件
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">文件不存在</h2>
          <p className="text-gray-600 mb-4">请检查文件链接是否正确</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              返回
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* 返回按钮 */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white/80 transition-colors border border-white/30 z-50 relative"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        )}

        {/* 文件信息卡片 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {getFileTypeIcon(getFileType(file))}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 truncate">
                  {file.original_name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{file.author_name || '未知用户'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDistanceToNow(new Date(file.created_at), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <File className="w-4 h-4" />
                    <span>{formatFileSize(file.file_size)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文件预览内容 */}
        {renderFileContent()}
      </div>
    </div>
  )
}

const getFileTypeIcon = (fileType: string) => {
  switch (fileType) {
    case 'document':
      return <FileText className="w-8 h-8 text-blue-500" />
    case 'image':
      return <Image className="w-8 h-8 text-green-500" />
    case 'video':
      return <Video className="w-8 h-8 text-purple-500" />
    case 'audio':
      return <Music className="w-8 h-8 text-orange-500" />
    default:
      return <File className="w-8 h-8 text-gray-500" />
  }
}
