'use client'

import { useState, useEffect } from 'react'
import { FileItem } from '@/lib/supabase'
import { Search, Filter, FileText, Image, Video, Music, File } from 'lucide-react'
import FileCard from './FileCard'

interface FileGridProps {
  sort?: 'newest' | 'popular'
  limit?: number
  showFilters?: boolean
}

export default function FileGrid({ sort = 'newest', limit = 40, showFilters = true }: FileGridProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchFiles()
  }, [sort, limit])

  useEffect(() => {
    filterFiles()
  }, [files, searchTerm, fileTypeFilter])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: String(limit), sort })
      const res = await fetch(`/api/files/public?${params}`)
      const result = await res.json()
      if (result.success && result.files) {
        setFiles(result.files)
      } else {
        setFiles([])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const filterFiles = () => {
    let filtered = files

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 文件类型过滤（从 file_type 或 mime_type/扩展名推断）
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(file => {
        const type = file.file_type || inferFileType(file)
        return type === fileTypeFilter
      })
    }

    setFilteredFiles(filtered)
  }

  const inferFileType = (file: FileItem): string => {
    const mime = (file as any).mime_type || ''
    const name = file.original_name || ''
    const ext = name.toLowerCase().split('.').pop() || ''
    if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image'
    if (mime.startsWith('video/') || ['mp4','webm','mov','mkv','avi','wmv','flv'].includes(ext)) return 'video'
    if (mime.startsWith('audio/') || ['mp3','wav','flac','aac','ogg'].includes(ext)) return 'audio'
    if (['pdf','doc','docx','txt','xls','xlsx','ppt','pptx'].includes(ext)) return 'document'
    return 'file'
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'document':
        return <FileText className="w-5 h-5" />
      case 'image':
        return <Image className="w-5 h-5" />
      case 'video':
        return <Video className="w-5 h-5" />
      case 'audio':
        return <Music className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  const fileTypes = [
    { value: 'all', label: '全部', icon: <File className="w-4 h-4" /> },
    { value: 'document', label: '文档', icon: <FileText className="w-4 h-4" /> },
    { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
    { value: 'video', label: '视频', icon: <Video className="w-4 h-4" /> },
    { value: 'audio', label: '音频', icon: <Music className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 搜索和过滤 */}
      {showFilters && (
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索文件名称、作者或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* 文件类型过滤 */}
          <div className="flex gap-2">
            {fileTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setFileTypeFilter(type.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  fileTypeFilter === type.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* 文件统计 */}
      <div className="mb-6">
        <p className="text-gray-600">
          找到 <span className="font-semibold text-primary-600">{filteredFiles.length}</span> 个文件
        </p>
      </div>

      {/* 文件网格 */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">没有找到文件</h3>
          <p className="text-gray-400">尝试调整搜索条件或文件类型过滤</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  )
} 