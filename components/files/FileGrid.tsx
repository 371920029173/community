'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileItem } from '@/lib/supabase'
import { Search, Filter, FileText, Image, Video, Music, File } from 'lucide-react'
import FileCard from './FileCard'

export default function FileGrid() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchFiles()
  }, [])

  useEffect(() => {
    filterFiles()
  }, [files, searchTerm, fileTypeFilter])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      
      // 检查Supabase连接
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('Supabase not configured, using mock data')
        setFiles([
          {
            id: '1',
            original_name: '示例文档.pdf',
            filename: '示例文档.pdf',
            file_path: 'demo/示例文档.pdf',
            user_id: 'demo',
            file_size: 1024000,
            mime_type: 'application/pdf',
            is_public: true,
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            original_name: '示例图片.jpg',
            filename: '示例图片.jpg',
            file_path: 'demo/示例图片.jpg',
            user_id: 'demo',
            file_size: 2048000,
            mime_type: 'image/jpeg',
            is_public: true,
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('files')
        .select('id, original_name, filename, file_path, user_id, file_size, mime_type, is_public, is_approved, created_at, updated_at')
        .eq('is_public', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(40)

      if (error) {
        console.error('Error fetching files:', error)
        // 使用示例文件
        setFiles([
          {
            id: '1',
            original_name: '示例文档.pdf',
            filename: '示例文档.pdf',
            file_path: 'demo/示例文档.pdf',
            user_id: 'demo',
            file_size: 1024000,
            mime_type: 'application/pdf',
            is_public: true,
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      } else {
        setFiles(data || [])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      // 使用示例文件
      setFiles([
        {
          id: '1',
          original_name: '示例文档.pdf',
          filename: '示例文档.pdf',
          file_path: 'demo/示例文档.pdf',
          user_id: 'demo',
          file_size: 1024000,
          mime_type: 'application/pdf',
          is_public: true,
          is_approved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
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

    // 文件类型过滤
    if (fileTypeFilter !== 'all') {
      // 文件类型过滤暂时禁用，因为file_type字段不存在
      // filtered = filtered.filter(file => file.file_type === fileTypeFilter)
    }

    setFilteredFiles(filtered)
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