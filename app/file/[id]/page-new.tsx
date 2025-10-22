'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileItem, Comment } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  File, 
  User, 
  Calendar, 
  Heart, 
  MessageCircle, 
  Download,
  Eye,
  Shield,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function FileDetailPage() {
  const params = useParams()
  const fileId = params.id as string
  const { user, loading: authLoading } = useAuth()
  
  const [file, setFile] = useState<FileItem | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (fileId && !authLoading) {
      fetchFileDetails()
      fetchComments()
    }
  }, [fileId, authLoading])

  useEffect(() => {
    if (file) {
      console.log('文件信息:', {
        id: file.id,
        name: file.original_name,
        type: file.mime_type,
        size: file.file_size,
        isPublic: file.is_public,
        isApproved: file.is_approved
      })
      
      // 只对文本文档获取内容
      const fileType = getFileType(file)
      if (fileType === 'text') {
        console.log('检测到文本文档，开始获取内容...')
        fetchFileContent()
      } else {
        setFileContent('')
      }
    }
  }, [file])

  const fetchFileDetails = async () => {
    try {
      // 等待用户信息加载完成
      if (authLoading) {
        console.log('等待用户信息加载...')
        return
      }
      
      // 检查Supabase会话状态
      const { data: { session } } = await supabase.auth.getSession()
      console.log('文件预览认证检查:', { 
        hasUser: !!user?.id, 
        authLoading, 
        hasSession: !!session?.user?.id,
        userId: user?.id,
        sessionUserId: session?.user?.id
      })
      
      // 如果认证已完成但用户未登录，显示错误
      if (!user?.id && !session?.user?.id) {
        console.error('用户未登录，用户状态:', { user, authLoading, session })
        throw new Error('用户未登录，请先登录')
      }
      
      // 如果是管理员，可以查看未审核的文件
      const isAdmin = user?.is_admin || user?.is_moderator
      
      console.log('文件查询参数:', {
        fileId,
        isAdmin,
        userId: user?.id,
        username: user?.username,
        authLoading
      })
      
      // 构建查询条件
      let query = supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
      
      // 如果不是管理员，只能查看公开且已审核的文件
      if (!isAdmin) {
        query = query.eq('is_public', true).eq('is_approved', true)
        console.log('普通用户查询条件: is_public=true, is_approved=true')
      } else {
        console.log('管理员查询条件: 无限制')
      }
      
      // 添加调试信息
      console.log('查询条件:', {
        fileId,
        isAdmin,
        queryString: query.toString()
      })
      
      console.log('执行文件查询，fileId:', fileId)
      const { data, error } = await query.single()
      
      console.log('文件查询结果:', { data, error })

      if (error) {
        console.error('文件查询错误:', error)
        console.error('错误详情:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      
      console.log('找到文件:', data)
      setFile(data)
    } catch (error) {
      console.error('Error fetching file:', error)
      toast.error('File not found or has been deleted')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // 构建文件URL
  const getFileUrl = (file: FileItem | null): string | null => {
    if (!file) return null
    // 优先使用数据库中的file_url字段，如果不存在则从Supabase Storage构建
    if (file.file_url) {
      return file.file_url
    }
    const { data } = supabase.storage.from('files').getPublicUrl(file.file_path)
    return data.publicUrl
  }

  // 安全获取文件URL，如果为null则返回空字符串
  const getSafeFileUrl = (file: FileItem | null): string => {
    return getFileUrl(file) || ''
  }

  // 获取文件类型
  const getFileType = (file: FileItem | null) => {
    if (!file) return 'file'
    // 优先使用数据库中的file_type字段
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      // 这里需要用户登录验证
      const { error } = await supabase
        .from('comments')
        .insert({
          file_id: fileId,
          user_id: 'temp-user-id', // 实际使用时从认证上下文获取
          username: '匿名用户', // 实际使用时从认证上下文获取
          content: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      await fetchComments()
      toast.success('评论发布成功')
    } catch (error) {
      console.error('Error submitting comment:', error)
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
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
        return <Music className="w-8 h-8 text-pink-500" />
      case 'text':
        return <FileText className="w-8 h-8 text-orange-500" />
      default:
        return <File className="w-8 h-8 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 检查是否为docx文件
  const isDocxFile = (file: FileItem | null) => {
    if (!file) return false
    const fileNameLower = file.original_name.toLowerCase()
    const mimeType = file.mime_type || ''
    
    return fileNameLower.endsWith('.docx') ||
           mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           (mimeType.includes('wordprocessingml') && mimeType.includes('document'))
  }

  // 检查是否为Excel文件
  const isExcelFile = (file: FileItem | null) => {
    if (!file) return false
    const fileNameLower = file.original_name.toLowerCase()
    const mimeType = file.mime_type || ''
    
    return fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls') ||
           mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           mimeType === 'application/vnd.ms-excel'
  }

  // 检查是否为PowerPoint文件
  const isPowerPointFile = (file: FileItem | null) => {
    if (!file) return false
    const fileNameLower = file.original_name.toLowerCase()
    const mimeType = file.mime_type || ''
    
    return fileNameLower.endsWith('.pptx') || fileNameLower.endsWith('.ppt') ||
           mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
           mimeType === 'application/vnd.ms-powerpoint'
  }

  // 检查是否为PDF文件
  const isPdfFile = (file: FileItem | null) => {
    if (!file) return false
    const fileNameLower = file.original_name.toLowerCase()
    const mimeType = file.mime_type || ''
    
    return fileNameLower.endsWith('.pdf') || mimeType === 'application/pdf'
  }

  const renderFileContent = () => {
    if (!file) return null

    // 特殊处理Word文档 - 使用Microsoft Office Online预览
    if (isDocxFile(file)) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`
      
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">Word文档预览</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="在新窗口预览"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  预览
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={officeViewerUrl}
                width="100%"
                height="600"
                frameBorder="0"
                className="w-full"
                title={`预览 ${file.original_name}`}
                onError={() => {
                  console.log('Office Online预览失败，显示备用方案')
                }}
              />
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>如果预览无法显示，请尝试在新窗口中打开或下载文件</p>
              <div className="flex justify-center space-x-3 mt-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>在新窗口预览</span>
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>下载文件</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 特殊处理Excel文档
    if (isExcelFile(file)) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`
      
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">Excel文档预览</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="在新窗口预览"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  预览
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={officeViewerUrl}
                width="100%"
                height="600"
                frameBorder="0"
                className="w-full"
                title={`预览 ${file.original_name}`}
              />
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>如果预览无法显示，请尝试在新窗口中打开或下载文件</p>
              <div className="flex justify-center space-x-3 mt-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>在新窗口预览</span>
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>下载文件</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 特殊处理PowerPoint文档
    if (isPowerPointFile(file)) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`
      
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">PowerPoint文档预览</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm"
                  title="在新窗口预览"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  预览
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={officeViewerUrl}
                width="100%"
                height="600"
                frameBorder="0"
                className="w-full"
                title={`预览 ${file.original_name}`}
              />
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>如果预览无法显示，请尝试在新窗口中打开或下载文件</p>
              <div className="flex justify-center space-x-3 mt-2">
                <button
                  onClick={() => window.open(officeViewerUrl, '_blank')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>在新窗口预览</span>
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>下载文件</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 特殊处理PDF文档
    if (isPdfFile(file)) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                <span className="font-medium">PDF文档预览</span>
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={getSafeFileUrl(file)}
                width="100%"
                height="600"
                frameBorder="0"
                className="w-full"
                title={`预览 ${file.original_name}`}
              />
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>如果预览无法显示，请尝试在新窗口中打开或下载文件</p>
              <div className="flex justify-center space-x-3 mt-2">
                <button
                  onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>在新窗口打开</span>
                </button>
                <a
                  href={getSafeFileUrl(file)}
                  download={file.original_name}
                  className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>下载文件</span>
                </a>
              </div>
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
              <div className="p-6">
                <div className="relative">
                  <img
                    src={getSafeFileUrl(file)}
                    alt={file.original_name}
                    className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                    style={{ maxHeight: '70vh' }}
                    onError={(e) => {
                      console.error('图片加载失败:', e)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
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
                  <span className="font-medium">视频预览</span>
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
            <div className="p-6">
              <video
                controls
                className="w-full rounded-lg shadow-lg"
                style={{ maxHeight: '70vh' }}
              >
                <source src={getSafeFileUrl(file)} type={file.mime_type || 'video/mp4'} />
                您的浏览器不支持视频播放。
              </video>
            </div>
          </div>
        )

      case 'audio':
        return (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Music className="w-6 h-6 mr-2" />
                  <span className="font-medium">音频预览</span>
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
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <Music className="w-16 h-16 mx-auto mb-4 text-pink-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{file.original_name}</h3>
                <audio controls className="w-full max-w-md mx-auto">
                  <source src={getSafeFileUrl(file)} type={file.mime_type || 'audio/mpeg'} />
                  您的浏览器不支持音频播放。
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
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">文件内容预览</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {fileContent.length} 字符
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {fileContent.split('\n').length} 行
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-white/60 backdrop-blur-sm p-4 rounded border">
                        {fileContent || '文件内容为空'}
                      </pre>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>在新窗口打开</span>
                      </button>
                    </div>
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
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <File className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{file.original_name}</h3>
                <p className="text-gray-600 mb-4">此文件类型暂不支持在线预览</p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-6">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {formatFileSize(file.file_size)}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {getFileType(file)}
                  </span>
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    在新窗口打开
                  </button>
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    下载文件
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 ml-4">
            {authLoading ? '正在验证用户权限...' : '加载中...'}
          </p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">文件不存在</h1>
          <p className="text-gray-600 mb-4">该文件可能已被删除或不存在</p>
          <p className="text-sm text-gray-500 mb-4">文件ID: {fileId}</p>
          <div className="mt-8 flex flex-col items-center space-y-4">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回上一页</span>
            </button>
            {user?.is_admin && (
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">管理员调试信息</h3>
                <p className="text-sm text-yellow-700 mb-4">
                  作为管理员,你可以查看所有文件(包括未审核的)。如果这个文件ID确实存在,可能是权限或查询条件的问题。
                </p>
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  前往管理后台查看文件列表
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* 文件头部信息 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-start space-x-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            {getFileTypeIcon(getFileType(file))}
              </div>
            <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{file.original_name}</h1>
                <div className="flex items-center space-x-6 text-sm text-blue-100 mb-4">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>作者：Unknown</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  <span>{formatFileSize(file.file_size)}</span>
                </div>
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  <span>0 次查看</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!file.is_approved && (
                  <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    待审核
                  </span>
                )}
                {user?.is_admin && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    管理员
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回上一页</span>
              </button>
              <a
                href={getSafeFileUrl(file)}
                download={file.original_name}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm text-sm flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>下载文件</span>
              </a>
            </div>
          </div>
          </div>
        </div>

        {/* 文件预览区域 */}
        <div className="mb-8">
          {renderFileContent()}
        </div>

        {/* 评论区域 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-4 text-white">
            <div className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">评论 ({comments.length})</span>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
            </form>
            
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无评论，快来抢沙发吧！</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{comment.username}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: zhCN })}
                    </span>
                    </div>
                      <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
