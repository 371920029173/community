'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function DriveFileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [file, setFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [fileUrl, setFileUrl] = useState<string>('')
  const [fileId, setFileId] = useState<string>('')

  // 异步获取 fileId
  useEffect(() => {
    const getFileId = async () => {
      const resolvedParams = await params
      console.log('获取到的params:', resolvedParams)
      console.log('设置fileId:', resolvedParams.id)
      setFileId(resolvedParams.id as string)
    }
    getFileId()
  }, [params])

  useEffect(() => {
    if (fileId && !authLoading) {
      fetchFileDetails()
    }
  }, [fileId, authLoading])

  useEffect(() => {
    if (file) {
      const fileType = getFileType(file.original_name)
      console.log('文件类型检测:', fileType, '文件名:', file.original_name)
      
      // 只有文本文件才需要获取内容
      if (fileType === 'text') {
        fetchFileContent()
      }
    }
  }, [file])

  const fetchFileDetails = async () => {
    setLoading(true)
    try {
      console.log('fetchFileDetails调用，fileId:', fileId)
      if (!fileId) {
        throw new Error('文件ID缺失')
      }

      if (authLoading) {
        console.log('等待用户信息加载...')
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!user?.id && !session?.user?.id) {
        throw new Error('用户未登录，请先登录')
      }
      
      console.log('查询云盘文件，fileId:', fileId, 'userId:', user?.id)
      
      // 通过API获取云盘文件详情
      const response = await fetch(`/api/drive/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '获取文件失败')
      }
      
      console.log('云盘文件API响应:', result)
      console.log('设置文件URL:', result.url)
      
      // 使用返回的URL
      setFileUrl(result.url)
      
      // 构造FileItem对象
      const fileData = await supabase
        .from('drive_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', user?.id)
        .single()
      
      if (fileData.error) {
        console.error('数据库查询失败:', fileData.error)
        throw new Error('获取文件详情失败')
      }
      
      const fileItem: FileItem = {
        id: fileData.data.id,
        original_name: fileData.data.original_name,
        filename: fileData.data.filename,
        file_path: fileData.data.file_path,
        user_id: fileData.data.user_id,
        file_size: fileData.data.file_size,
        mime_type: fileData.data.mime_type,
        file_hash: fileData.data.file_hash,
        is_public: false,
        is_approved: true,
        created_at: fileData.data.created_at,
        updated_at: fileData.data.updated_at,
        file_type: fileData.data.file_type,
        file_url: result.url, // 使用API返回的signed URL
        author_name: '云盘文件'
      }
      
      setFile(fileItem)
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
      console.log('开始获取文件内容，file_path:', file.file_path)
      console.log('文件完整信息:', file)
      
      // 云盘文件存储在 drive 存储桶中
      const { data, error } = await supabase.storage
        .from('drive')
        .download(file.file_path)
      
      if (error) {
        console.error('从drive存储桶下载失败:', error)
        console.log('尝试从files存储桶下载...')
        
        // 如果drive存储桶失败，尝试files存储桶
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('files')
          .download(file.file_path)
        
        if (fallbackError) {
          console.error('从files存储桶下载也失败:', fallbackError)
          console.log('尝试使用file_url直接获取...')
          
          // 如果两个存储桶都失败，尝试直接通过file_url获取
          if (file.file_url) {
            try {
              const response = await fetch(file.file_url)
              if (response.ok) {
                const text = await response.text()
                console.log('通过file_url成功获取文件内容，长度:', text.length)
                setFileContent(text)
                return
              } else {
                console.error('通过file_url获取失败，状态:', response.status)
              }
            } catch (fetchError) {
              console.error('通过file_url获取失败:', fetchError)
            }
          }
          return
        }
        
        const text = await fallbackData.text()
        console.log('从files存储桶成功获取文件内容，长度:', text.length)
        setFileContent(text)
        return
      }

      const text = await data.text()
      console.log('从drive存储桶成功获取文件内容，长度:', text.length)
      setFileContent(text)
    } catch (error) {
      console.error('读取文件内容失败:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  const getFileType = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image'
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) return 'video'
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return 'audio'
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return 'document'
    if (['txt', 'md', 'json', 'xml', 'js', 'html', 'css'].includes(ext || '')) return 'text'
    return 'file'
  }

  const isTextFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop()
    return ['txt', 'md', 'json', 'xml', 'js', 'html', 'css'].includes(ext || '')
  }

  const isPdfFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.pdf')
  }

  const isDocumentFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop()
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')
  }

  const isDocxFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.docx')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = file?.original_name || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDelete = async () => {
    if (!file) return
    
    if (!confirm('确定要删除这个文件吗？')) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        return
      }

      const response = await fetch(`/api/drive/${file.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        toast.success('文件删除成功')
        router.push('/files')
      } else {
        const result = await response.json()
        toast.error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除文件失败:', error)
      toast.error('删除失败')
    }
  }

  const renderFileContent = () => {
    if (!file) return null

    const fileType = getFileType(file.original_name)
    const fileUrl = file.file_url || ''
    
    console.log('渲染文件内容:', {
      fileName: file.original_name,
      fileType,
      fileUrl,
      isDocx: isDocxFile(file.original_name)
    })

    switch (fileType) {
      case 'image':
        return (
          <div className="w-full">
            <img 
              src={fileUrl} 
              alt={file.original_name}
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={(e) => {
                console.error('图片加载失败:', e)
                toast.error('图片加载失败')
              }}
            />
          </div>
        )
      
      case 'video':
        return (
          <div className="w-full">
            <video 
              src={fileUrl} 
              controls 
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={(e) => {
                console.error('视频加载失败:', e)
                toast.error('视频加载失败')
              }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        )
      
      case 'audio':
        return (
          <div className="w-full">
            <audio 
              src={fileUrl} 
              controls 
              className="w-full"
              onError={(e) => {
                console.error('音频加载失败:', e)
                toast.error('音频加载失败')
              }}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        )
      
      case 'document':
        if (isDocxFile(file.original_name)) {
          console.log('渲染Word文档，fileUrl:', fileUrl)
          return (
            <div className="w-full h-96">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                className="w-full h-full rounded-lg shadow-lg"
                title={file.original_name}
                onError={(e) => {
                  console.error('Word文档在线预览失败:', e)
                  toast.error('Word文档预览失败，请下载查看')
                }}
              />
            </div>
          )
        }
        return (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">此文件类型不支持在线预览</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </button>
          </div>
        )
      
      case 'text':
        if (loadingContent) {
          return (
            <div className="w-full h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )
        }
        return (
          <div className="w-full">
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {fileContent || '无法读取文件内容'}
            </pre>
          </div>
        )
      
      default:
        return (
          <div className="text-center py-8">
            <File className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">此文件类型不支持在线预览</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </button>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <File className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">文件不存在</h2>
            <p className="text-gray-500 mb-4">该文件可能已被删除或您没有访问权限</p>
            <button
              onClick={() => router.push('/files')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回云盘
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
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/files')}
            className="inline-flex items-center px-4 py-2 mb-6 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white/80 transition-colors z-50 relative"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回云盘
          </button>

          {/* 文件信息卡片 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getFileType(file.original_name) === 'image' && <Image className="w-6 h-6 text-blue-600" />}
                  {getFileType(file.original_name) === 'video' && <Video className="w-6 h-6 text-blue-600" />}
                  {getFileType(file.original_name) === 'audio' && <Music className="w-6 h-6 text-blue-600" />}
                  {getFileType(file.original_name) === 'document' && <FileText className="w-6 h-6 text-blue-600" />}
                  {getFileType(file.original_name) === 'text' && <FileText className="w-6 h-6 text-blue-600" />}
                  {getFileType(file.original_name) === 'file' && <File className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{file.original_name}</h1>
                  <p className="text-gray-600">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>

            {/* 文件元数据 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>云盘文件</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: zhCN })}</span>
              </div>
            </div>
          </div>

          {/* 文件预览 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">文件预览</h2>
            {renderFileContent()}
          </div>
        </div>
      </div>
    </div>
  )
}