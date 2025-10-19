'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileItem } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  File, 
  Download,
  Eye,
  ArrowLeft,
  Share2,
  Heart
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function FileViewPage() {
  const params = useParams()
  const fileId = params.id as string
  
  const [file, setFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (fileId) {
      fetchFileDetails()
    }
  }, [fileId])

  useEffect(() => {
    if (file && file.mime_type?.includes('text/plain')) {
      fetchFileContent()
    }
  }, [file])

  const fetchFileDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('is_public', true)
        .eq('is_approved', true)
        .single()

      if (error) throw error
      setFile(data)
    } catch (error) {
      console.error('Error fetching file:', error)
      toast.error('文件不存在或已被删除')
    } finally {
      setLoading(false)
    }
  }

  // 构建文件URL
  const getFileUrl = (file: FileItem | null): string | null => {
    if (!file) return null
    const { data } = supabase.storage.from('files').getPublicUrl(file.file_path)
    return data.publicUrl
  }

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

  const fetchFileContent = async () => {
    const fileUrl = getFileUrl(file)
    if (!fileUrl) return
    
    setLoadingContent(true)
    try {
      const response = await fetch(fileUrl)
      if (response.ok) {
        const content = await response.text()
        setFileContent(content)
      } else {
        setFileContent('无法加载文件内容')
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContent('加载文件内容时出错')
    } finally {
      setLoadingContent(false)
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderFileContent = () => {
    if (!file) return null

    switch (getFileType(file.original_name)) {
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={getFileUrl(file) || ''} 
              alt={file.original_name}
              className="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        )
      case 'video':
        return (
          <div className="text-center">
            <video 
              controls 
              className="max-w-full h-auto rounded-lg shadow-lg"
            >
              <source src={getFileUrl(file) || ''} type="video/mp4" />
              您的浏览器不支持视频播放
            </video>
          </div>
        )
      case 'audio':
        return (
          <div className="text-center">
            <audio 
              controls 
              className="w-full max-w-md"
            >
              <source src={getFileUrl(file) || ''} type="audio/mpeg" />
              您的浏览器不支持音频播放
            </audio>
          </div>
        )
      case 'document':
        // 检查是否是txt文件
        if (file.mime_type?.includes('text/plain')) {
          return (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* 文件头部 */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 mr-3" />
                    <div>
                      <h2 className="text-xl font-bold">{file.original_name}</h2>
                      <p className="text-blue-100 text-sm">
                        {formatFileSize(file.file_size)} • 文本文件
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(getFileUrl(file) || '', '_blank')}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                      title="在新窗口打开"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      打开
                    </button>
                    <a
                      href={getFileUrl(file) || ''}
                      download={file.original_name}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                      title="下载文件"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      下载
                    </a>
                  </div>
                </div>
              </div>
              
              {/* 文件内容 */}
              <div className="p-6">
                {loadingContent ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">加载内容中...</span>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">文件内容</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{fileContent.length} 字符</span>
                          <span>•</span>
                          <span>{fileContent.split('\n').length} 行</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                        {fileContent || '文件内容为空'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        } else {
          // 其他文档类型
          return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="paper-bg min-h-[600px] p-8">
                <h1 className="text-2xl font-bold mb-4">{file.original_name}</h1>
                <p className="text-gray-600 mb-4">
                  作者：Unknown | 
                  发布时间：{formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: zhCN })}
                </p>
                <div className="prose max-w-none">
                  <p>这是一个文档文件。点击下载按钮查看完整内容。</p>
                </div>
              </div>
            </div>
          )
        }
      default:
        return (
          <div className="text-center py-12">
            <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">此文件类型暂不支持预览</p>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Navbar />
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">文件不存在</h1>
          <p className="text-gray-600">该文件可能已被删除或不存在</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回
          </button>
        </div>

        {/* 文件头部信息 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                 {getFileTypeIcon(getFileType(file.original_name))}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{file.original_name}</h1>
                <div className="flex items-center space-x-6 text-sm text-blue-100 mb-4">
                  <div className="flex items-center">
                     <span>作者：Unknown</span>
                  </div>
                  <div className="flex items-center">
                    <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: zhCN })}</span>
                  </div>
                  <div className="flex items-center">
                     <span>0 次查看</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <a
                    href={getFileUrl(file) || ''}
                    download={file.original_name}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载文件
                  </a>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center">
                    <Heart className="w-4 h-4 mr-2" />
                    收藏
                  </button>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center">
                    <Share2 className="w-4 h-4 mr-2" />
                    分享
                  </button>
                </div>
              </div>
              <div className="text-right text-sm text-blue-100">
                <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                  <div className="text-xs opacity-80">文件大小</div>
                  <div className="font-bold text-lg">{formatFileSize(file.file_size)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文件内容 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-200/50">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-500" />
              文件内容
            </h2>
          </div>
          <div className="p-6">
            {renderFileContent()}
          </div>
        </div>
      </main>
    </div>
  )
}

