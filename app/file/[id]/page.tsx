'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileItem, CommentWithReplies } from '@/lib/supabase'
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
  ExternalLink,
  Bookmark,
  ChevronRight,
  Reply
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getFriendlyErrorMessage } from '@/lib/utils'

export default function FileDetailPage() {
  const params = useParams()
  const [fileId, setFileId] = useState<string>('')
  
  useEffect(() => {
    const getFileId = async () => {
      const resolvedParams = await params
      setFileId(resolvedParams.id as string)
    }
    getFileId()
  }, [params])
  const { user, loading: authLoading } = useAuth()
  
  const [file, setFile] = useState<FileItem | null>(null)
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [authorName, setAuthorName] = useState<string>('')
  const [likesCount, setLikesCount] = useState<number>(0)
  const [isLiking, setIsLiking] = useState(false)
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [favoriteCollections, setFavoriteCollections] = useState<{ id: string; name: string }[]>([])
  const [addingToFavorite, setAddingToFavorite] = useState(false)

  useEffect(() => {
    if (fileId && !authLoading) {
      // 添加延迟，避免权限检查闪烁
      const timer = setTimeout(() => {
      fetchFileDetails()
      fetchComments()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [fileId, authLoading])

  useEffect(() => {
    if (file) {
      console.log('文件信息:', {
        name: file.original_name,
        mime_type: file.mime_type,
        filename: file.filename,
        isTextPlain: file.mime_type?.includes('text/plain'),
        isTxtFile: file.original_name?.toLowerCase().endsWith('.txt')
      })
      
      // 只对文本文档获取内容，避免Word文档被当作文本处理
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
      
      // 构建查询条件（明确指定需要的字段，包括统计字段）
      let query = supabase
        .from('files')
        .select('*, download_count, likes_count, comments_count, favorites_count')
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
      setLikesCount(data.likes_count || 0)
      
      // 记录浏览量（打开详情页时增加）
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          // 异步更新浏览量，不等待结果
          fetch(`/api/files/${fileId}/view`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(err => console.warn('更新浏览量失败:', err))
        }
      } catch (err) {
        console.warn('记录浏览量失败:', err)
      }
      
      // 获取作者信息
      if (data) {
        // 优先使用 author_name 字段
        if (data.author_name) {
          setAuthorName(data.author_name)
        } else if (data.user_id) {
          // 如果 author_name 不存在，根据 user_id 查询 users 表
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('username, nickname')
              .eq('id', data.user_id)
              .single()
            
            if (!userError && userData) {
              setAuthorName(userData.nickname || userData.username || '未知用户')
            } else {
              console.warn('获取作者信息失败:', userError)
              setAuthorName('未知用户')
            }
          } catch (userFetchError) {
            console.error('查询作者信息时发生错误:', userFetchError)
            setAuthorName('未知用户')
          }
        } else {
          setAuthorName('未知用户')
        }
      }
    } catch (error) {
      console.error('Error fetching file:', error)
      toast.error(getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      // 使用 API 端点获取评论
      const response = await fetch(`/api/comments?fileId=${fileId}`)
      const result = await response.json()

      if (result.success) {
        setComments(result.data || [])
      } else {
        console.error('获取评论失败:', result.error)
        // 如果 API 失败，尝试直接查询（向后兼容）
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('file_id', fileId)
          .order('created_at', { ascending: true })

        if (!error && data) {
          setComments(data)
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      // 如果 API 失败，尝试直接查询（向后兼容）
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('file_id', fileId)
          .order('created_at', { ascending: true })

        if (!error && data) {
          setComments(data)
        }
      } catch (fallbackError) {
        console.error('Fallback 查询评论也失败:', fallbackError)
      }
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
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return 'document'
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
        if (content.includes('�')) {
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
        setFileContent('无法加载文件内容，请检查文件是否存在')
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContent('文件内容加载失败，请刷新页面后重试')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    // 检查用户是否登录
    if (!user?.id) {
      toast.error('请先登录后再发表评论')
      return
    }

    setSubmitting(true)
    try {
      // 获取认证 token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('请先登录后再发表评论')
        setSubmitting(false)
        return
      }

      // 调用 API 端点创建评论
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId: fileId,
          content: newComment.trim(),
          ...(replyingTo && { parentId: replyingTo })
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '评论发布失败')
      }

      setNewComment('')
      setReplyingTo(null)
      await fetchComments()
      
      // 刷新文件信息以更新评论数
      if (file) {
        const { data: updatedFile } = await supabase
          .from('files')
          .select('comments_count')
          .eq('id', fileId)
          .single()
        if (updatedFile) {
          const totalCount = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0)
        setFile({ ...file, comments_count: updatedFile.comments_count ?? (totalCount + 1) })
        }
      }
      
      toast.success(result.message || '评论发布成功')
    } catch (error: any) {
      console.error('Error submitting comment:', error)
      toast.error(getFriendlyErrorMessage(error) || '评论发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!user?.id || !fileId || isLiking) return

    // 检查用户是否登录
    if (!user?.id) {
      toast.error('请先登录后再点赞')
      return
    }

    setIsLiking(true)
    try {
      // 获取认证 token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('请先登录后再点赞')
        setIsLiking(false)
        return
      }

      // 调用 API 端点点赞
      const response = await fetch(`/api/files/${fileId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '点赞失败')
      }

      // 更新点赞数
      setLikesCount(result.data.likes_count || 0)
      if (file) {
        setFile({ ...file, likes_count: result.data.likes_count || 0 })
      }
      toast.success(result.message || '点赞成功')
    } catch (error: any) {
      console.error('Error liking file:', error)
      toast.error(getFriendlyErrorMessage(error) || '点赞失败，请重试')
    } finally {
      setIsLiking(false)
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

  // 检查是否为 Word 文件（docx 或 doc）
  const isWordFile = (file: FileItem | null) => {
    if (!file) return false
    const fileNameLower = file.original_name.toLowerCase()
    const mimeType = file.mime_type || ''
    
    // 检查 .docx 文件
    if (fileNameLower.endsWith('.docx') ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (mimeType.includes('wordprocessingml') && mimeType.includes('document'))) {
      return true
    }
    
    // 检查 .doc 文件
    if (fileNameLower.endsWith('.doc') ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.ms-word.document.macroEnabled.12') {
      return true
    }
    
    return false
  }

  const renderFileContent = () => {
    if (!file) return null

    // 特殊处理 Word 文件（docx 或 doc）
    if (isWordFile(file)) {
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
          <div className="p-6 text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Word 文档在线预览</h3>
              <p className="text-gray-600 mb-4">使用 Microsoft Office Online Viewer 预览文档</p>
              
              {/* 在线预览iframe */}
              <div className="mb-6">
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getSafeFileUrl(file))}`}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  className="rounded-lg shadow-lg border border-gray-200"
                  title="Word 文档预览"
                />
              </div>
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
                  下载文档
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
                      onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                      title="在新窗口打开"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      打开
                    </button>
                    <a
                      href={getSafeFileUrl(file)}
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
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-600" />
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
        } else {
          // 其他文档类型
          return (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 mr-2" />
                    <span className="font-medium">文档预览</span>
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
              <div className="p-8">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{file.original_name}</h2>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        {formatFileSize(file.file_size)}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                        {getFileType(file)}
                      </span>
                    </div>
                  </div>
                  
                  
                  <div className="text-center py-8">
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">文档预览</h3>
                      <p className="text-gray-600 mb-4">此文档类型暂不支持在线预览</p>
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
            </div>
          </div>
        )
        }
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
            <div className="p-8 text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <File className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">文件预览</h3>
                <p className="text-gray-600 mb-6">此文件类型暂不支持在线预览</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => window.open(getSafeFileUrl(file), '_blank')}
                    className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl"
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
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上一页
            </button>
            {user?.is_admin && (
              <div className="p-4 bg-blue-50 rounded-lg max-w-md">
                <h3 className="font-medium text-blue-900 mb-2">管理员调试信息</h3>
                <p className="text-sm text-blue-700">
                  作为管理员，你可以查看所有文件（包括未审核的）。
                  如果这个文件ID确实存在，可能是权限或查询条件的问题。
                </p>
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
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
                  <User className="w-4 h-4 mr-2" />
                  <span>{authorName || '未知用户'}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: zhCN })}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>{file.download_count ?? 0} 次查看</span>
                </div>
                  {/* 审核状态提示 - 仅管理员可见 */}
                  {user?.is_admin && !file.is_approved && (
                    <div className="flex items-center bg-yellow-500/20 px-3 py-1 rounded-full">
                      <Shield className="w-4 h-4 mr-2" />
                      <span className="text-yellow-200 font-medium">待审核</span>
              </div>
              )}
              </div>
              <div className="flex items-center space-x-4">
                  <a
                    href={getSafeFileUrl(file)}
                    download={file.original_name}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center"
                  >
                  <Download className="w-4 h-4 mr-2" />
                  下载文件
                  </a>
                  <button
                    onClick={handleLike}
                    disabled={isLiking || !user?.id}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${likesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                    {likesCount > 0 ? likesCount : ''} 点赞
                  </button>
                  {user?.id && (
                    <button
                      onClick={async () => {
                        setShowFavoriteModal(true)
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return
                          const res = await fetch('/api/favorites/collections', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
                          const json = await res.json()
                          if (json.success) setFavoriteCollections(json.data || [])
                        } catch { setFavoriteCollections([]) }
                      }}
                      className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center"
                      title="收藏到收藏夹"
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      收藏
                    </button>
                  )}
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
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 mb-8 overflow-hidden">
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

        {/* 评论区 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-200/50">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2 text-blue-500" />
            评论 ({comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0)})
          </h2>
          </div>
          <div className="p-6">
          {/* 发表评论 */}
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? '写下你的回复...' : '写下你的评论...'}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
              rows={3}
            />
                <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {submitting ? '发布中...' : '发布评论'}
              </button>
                </div>
            </div>
          </form>

          {/* 评论列表（含回复） */}
          <div className="space-y-4">
            {comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">暂无评论，快来发表第一条评论吧！</p>
                </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      {comment.avatar_url ? (
                        <img
                          src={comment.avatar_url}
                          alt={comment.username}
                          className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-white"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${comment.avatar_url ? 'hidden' : ''}`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{comment.username}</span>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: zhCN })}
                          </span>
                          {user?.id && (
                            <button
                              type="button"
                              onClick={() => { setReplyingTo(comment.id); setNewComment('') }}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              回复
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                  {/* 回复列表 */}
                  {(comment.replies?.length ?? 0) > 0 && (
                    <div className="ml-12 space-y-2 pl-4 border-l-2 border-gray-200">
                      {comment.replies!.map((reply) => (
                        <div key={reply.id} className="bg-gray-50/80 rounded-lg p-3 border border-gray-100">
                          <div className="flex items-start space-x-3">
                            {reply.avatar_url ? (
                              <img src={reply.avatar_url} alt={reply.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                            ) : null}
                            <div className={`w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 ${reply.avatar_url ? 'hidden' : ''}`}>
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                <span className="font-medium text-gray-800 text-sm">{reply.username}</span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: zhCN })}
                                </span>
                                {user?.id && (
                                  <button
                                    type="button"
                                    onClick={() => { setReplyingTo(comment.id); setNewComment(`@${reply.username} `) }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    回复
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm leading-relaxed">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        </div>

        {/* 收藏到收藏夹弹窗 */}
        {showFavoriteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFavoriteModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">收藏到收藏夹</h3>
              {favoriteCollections.length === 0 ? (
                <p className="text-gray-500 text-sm mb-4">暂无收藏夹，请先在<a href="/profile/favorites" className="text-blue-600 hover:underline">个人中心</a>创建</p>
              ) : (
                <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {favoriteCollections.map(c => (
                    <li key={c.id}>
                      <button
                        onClick={async () => {
                          if (addingToFavorite || !fileId) return
                          setAddingToFavorite(true)
                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session) { toast.error('请先登录'); return }
                            const res = await fetch(`/api/favorites/collections/${c.id}/items`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                              body: JSON.stringify({ fileId })
                            })
                            const json = await res.json()
                            if (json.success) {
                              toast.success(`已添加到「${c.name}」`)
                              setShowFavoriteModal(false)
                            } else toast.error(json.error || '添加失败')
                          } catch { toast.error('添加失败') }
                          finally { setAddingToFavorite(false) }
                        }}
                        disabled={addingToFavorite}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        {addingToFavorite ? <span className="text-sm text-gray-400">添加中...</span> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={() => setShowFavoriteModal(false)} className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">关闭</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 