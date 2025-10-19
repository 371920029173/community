'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileItem } from '@/lib/supabase'
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
  Download,
  Eye,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function MessagesFilePreview() {
  const params = useParams()
  const fileId = params.id as string
  const { user, loading: authLoading } = useAuth()
  
  const [file, setFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (fileId && !authLoading) {
      // 添加延迟，避免权限检查闪烁
      const timer = setTimeout(() => {
        fetchFileDetails()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [fileId, authLoading])

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

  const fetchFileDetails = async () => {
    try {
      if (authLoading) {
        console.log('等待用户信息加载...')
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!user?.id && !session?.user?.id) {
        throw new Error('用户未登录，请先登录')
      }
      
      console.log('查询私信文件，fileId:', fileId, 'userId:', user?.id)
      
      const { data: fileData, error: fileError } = await supabase
        .from('messages')
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          file_url,
          mime_type,
          created_at,
          sender_id,
          receiver_id
        `)
        .eq('id', fileId)
        .eq('message_type', 'file')
        .single()

      console.log('私信文件查询结果:', { fileData, fileError })

      if (fileError) {
        console.error('文件查询错误:', fileError)
        throw new Error('文件不存在或无权限访问')
      }

      if (!fileData) {
        throw new Error('文件不存在')
      }

      // 检查权限：只有发送者或接收者可以查看
      const currentUserId = user?.id || session?.user?.id
      if (fileData.sender_id !== currentUserId && fileData.receiver_id !== currentUserId) {
        throw new Error('无权限查看此文件')
      }

      // 将messages表数据转换为FileItem格式
      const fileItem = {
        id: fileData.id,
        original_name: fileData.file_name,
        filename: fileData.file_name,
        file_path: fileData.file_url || '', // 使用file_url作为file_path
        user_id: fileData.sender_id,
        file_size: fileData.file_size || 0,
        mime_type: fileData.mime_type,
        file_hash: '',
        download_count: 0,
        is_public: false, // 私信文件默认不公开
        is_approved: true,
        created_at: fileData.created_at,
        updated_at: fileData.created_at,
        file_type: fileData.file_type,
        file_url: fileData.file_url,
        author_name: '私信文件'
      }

      setFile(fileItem)
      
      // 生成新的文件URL
      await generateFileUrl(fileItem)
    } catch (error: any) {
      console.error('获取文件详情失败:', error)
      toast.error(error.message || '获取文件失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchFileContent = async () => {
    if (!file) return
    
    setLoadingContent(true)
    try {
      // 私信文件可能存储在不同的存储桶中，尝试多个存储桶
      let data, error
      
      // 首先尝试从 files 存储桶下载
      const result1 = await supabase.storage
        .from('files')
        .download(file.file_path)
      
      if (!result1.error && result1.data) {
        data = result1.data
        error = null
      } else {
        // 如果 files 存储桶失败，尝试从 file-sharing 存储桶下载
        const result2 = await supabase.storage
          .from('file-sharing')
          .download(file.file_path)
        
        if (!result2.error && result2.data) {
          data = result2.data
          error = null
        } else {
          // 如果都失败，尝试直接通过 file_url 获取
          if (file.file_url) {
            const response = await fetch(file.file_url)
            if (response.ok) {
              data = await response.blob()
              error = null
            } else {
              error = new Error('无法获取文件内容')
            }
          } else {
            error = new Error('文件URL不存在')
          }
        }
      }

      if (error || !data) {
        console.error('下载文件内容失败:', error)
        return
      }

      const text = await data.text()
      setFileContent(text)
    } catch (error) {
      console.error('读取文件内容失败:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  const getFileType = (file: FileItem | null): string => {
    if (!file) return 'file'
    
    const fileName = file.original_name || file.filename || ''
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const mimeType = file.mime_type || ''
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mimeType.startsWith('image/')) return 'image'
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext) || mimeType.startsWith('video/')) return 'video'
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || mimeType.startsWith('audio/')) return 'audio'
    if (['pdf'].includes(ext) || mimeType === 'application/pdf') return 'pdf'
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) || 
        mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document'
    if (['txt', 'md', 'json', 'xml', 'js', 'html', 'css'].includes(ext) || mimeType.startsWith('text/')) return 'text'
    
    return 'file'
  }

  const isDocxFile = (file: FileItem | null): boolean => {
    if (!file) return false
    const fileName = file.original_name || file.filename || ''
    const mimeType = file.mime_type || ''
    return fileName.toLowerCase().endsWith('.docx') || 
           mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  const isPdfFile = (file: FileItem | null): boolean => {
    if (!file) return false
    const fileName = file.original_name || file.filename || ''
    const mimeType = file.mime_type || ''
    return fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf'
  }

  const isDocumentFile = (file: FileItem | null): boolean => {
    if (!file) return false
    const fileName = file.original_name || file.filename || ''
    const mimeType = file.mime_type || ''
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileName.split('.').pop()?.toLowerCase() || '') ||
           mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')
  }

  const [fileUrl, setFileUrl] = useState<string>('')
  const [urlGenerated, setUrlGenerated] = useState<boolean>(false)

  const generateFileUrl = async (file: FileItem | null) => {
    if (!file) {
      setUrlGenerated(true)
      return ''
    }
    
    setUrlGenerated(false)
    
    // 优先使用数据库中的file_url
    if (file.file_url) {
      setFileUrl(file.file_url)
      setUrlGenerated(true)
      return file.file_url
    }
    
    // 如果没有file_url，尝试生成新的signed URL
    if (file.file_path) {
      try {
        // 私信文件可能存储在files或file-sharing存储桶中
        let { data: signedUrl } = await supabase.storage
          .from('files')
          .createSignedUrl(file.file_path, 60 * 60) // 1小时有效期
        
        if (!signedUrl) {
          // 如果files存储桶失败，尝试file-sharing存储桶
          const result = await supabase.storage
            .from('file-sharing')
            .createSignedUrl(file.file_path, 60 * 60)
          signedUrl = result.data
        }
        
        if (signedUrl) {
          setFileUrl(signedUrl.signedUrl)
          setUrlGenerated(true)
          return signedUrl.signedUrl
        }
      } catch (error) {
        console.error('生成signed URL失败:', error)
      }
      
      // 如果生成signed URL失败，回退到public URL
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/files/${file.file_path}`
      setFileUrl(publicUrl)
      setUrlGenerated(true)
      return publicUrl
    }
    
    setUrlGenerated(true)
    return ''
  }

  const getFileUrl = (file: FileItem | null): string => {
    return fileUrl
  }

  const getSafeFileUrl = (file: FileItem | null): string => {
    return fileUrl || ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderFileContent = () => {
    if (!file) return null

    const fileType = getFileType(file)
    const fileUrl = getSafeFileUrl(file)

    switch (fileType) {
      case 'image':
        if (!urlGenerated || !fileUrl) {
          return (
            <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">正在生成图片链接...</p>
              </div>
            </div>
          )
        }
        return (
          <div className="w-full">
            <img 
              src={fileUrl} 
              alt={file.original_name}
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={(e) => {
                console.error('图片加载失败:', e)
                console.error('图片URL:', fileUrl)
                toast.error('图片加载失败')
              }}
            />
          </div>
        )

      case 'video':
        return (
          <div className="w-full">
            <video 
              controls 
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={(e) => {
                console.error('视频加载失败:', e)
                toast.error('视频加载失败')
              }}
            >
              <source src={fileUrl} type={file.mime_type || 'video/mp4'} />
              您的浏览器不支持视频播放
            </video>
          </div>
        )

      case 'audio':
        return (
          <div className="w-full">
            <audio 
              controls 
              className="w-full"
              onError={(e) => {
                console.error('音频加载失败:', e)
                toast.error('音频加载失败')
              }}
            >
              <source src={fileUrl} type={file.mime_type || 'audio/mpeg'} />
              您的浏览器不支持音频播放
            </audio>
          </div>
        )

      case 'pdf':
        return (
          <div className="w-full h-96">
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-lg shadow-lg"
              title={file.original_name}
              onError={(e) => {
                console.error('PDF加载失败:', e)
                toast.error('PDF加载失败')
              }}
            />
          </div>
        )

      case 'document':
        if (isDocxFile(file)) {
          return (
            <div className="w-full h-96">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                className="w-full h-full rounded-lg shadow-lg"
                title={file.original_name}
                onError={(e) => {
                  console.error('Word文档在线预览失败:', e)
                  // 如果在线预览失败，显示下载选项
                  const iframe = e.target as HTMLIFrameElement
                  iframe.style.display = 'none'
                  const fallback = document.createElement('div')
                  fallback.className = 'text-center py-8'
                  fallback.innerHTML = `
                    <div class="w-16 h-16 mx-auto text-gray-400 mb-4">
                      <svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <p class="text-gray-600 mb-4">Word文档在线预览失败，请下载查看</p>
                    <div class="space-x-4">
                      <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        在新窗口中打开
                      </a>
                      <a href="${fileUrl}" download="${file.original_name}" class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        下载文件
                      </a>
                    </div>
                  `
                  iframe.parentNode?.appendChild(fallback)
                }}
              />
            </div>
          )
        }
        return (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">文档无法在浏览器中直接预览</p>
            <div className="space-x-4">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                在新窗口中打开
              </a>
              <a
                href={fileUrl}
                download={file.original_name}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                下载文件
              </a>
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="w-full">
            {loadingContent ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">正在加载文件内容...</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                  {fileContent || '文件内容为空'}
                </pre>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <File className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">此文件类型无法预览</p>
            <a
              href={fileUrl}
              download={file.original_name}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </a>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">正在加载文件...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <File className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">文件不存在</h2>
            <p className="text-gray-600 mb-6">该文件可能已被删除或您没有访问权限</p>
            <button
              onClick={() => window.close()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上一页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* 返回按钮 */}
        <button
          onClick={() => window.close()}
          className="fixed top-20 left-4 z-50 inline-flex items-center px-3 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white transition-colors shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </button>

        <div className="max-w-4xl mx-auto">
          {/* 文件信息卡片 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getFileType(file) === 'image' && <Image className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'video' && <Video className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'audio' && <Music className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'pdf' && <FileText className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'document' && <FileText className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'text' && <FileText className="w-6 h-6 text-blue-600" />}
                  {getFileType(file) === 'file' && <File className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{file.original_name}</h1>
                  <p className="text-sm text-gray-600">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
            </div>

            {/* 文件详情 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>作者: {file.author_name || '未知用户'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>上传时间: {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: zhCN })}</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <a
                href={getSafeFileUrl(file)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                打开原始文件
              </a>
              <a
                href={getSafeFileUrl(file)}
                download={file.original_name}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                下载文件
              </a>
            </div>
          </div>

          {/* 文件预览 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">文件预览</h2>
            {renderFileContent()}
          </div>
        </div>
      </div>
    </div>
  )
}