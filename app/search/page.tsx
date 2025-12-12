'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
// import { SidebarAd } from '@/components/ads/AdBanner' // 已移除，仅保留主页广告
import { useAuth } from '@/components/providers/AuthProvider'
import { 
  Search, 
  Filter,
  Grid,
  List,
  Download,
  Share2,
  Eye,
  File,
  Image,
  Video,
  Music,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SearchResult {
  id: string
  name: string
  original_name: string
  file_type: string
  file_size: number
  file_url: string
  description: string
  author_name: string
  created_at: string
  is_public: boolean
}

export default function SearchPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    
    try {
      const response = await fetch('/api/files/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSearchResults(result.data || [])
        toast.success(`找到 ${result.data?.length || 0} 个文件`)
      } else {
        toast.error(result.error || '搜索失败')
        setSearchResults([])
      }
    } catch (error) {
      console.error('搜索错误:', error)
      toast.error('搜索失败，请稍后重试')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <Image className="w-5 h-5 text-green-500" />
      case 'video': return <Video className="w-5 h-5 text-purple-500" />
      case 'audio': return <Music className="w-5 h-5 text-orange-500" />
      case 'document': return <FileText className="w-5 h-5 text-blue-500" />
      default: return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {/* 搜索区域 */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">搜索文件</h1>
              <p className="text-xl text-gray-600 mb-8">快速找到您需要的文件</p>
              
              <div className="max-w-2xl mx-auto">
                <div className="flex space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="输入文件名、描述或标签..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? '搜索中...' : '搜索'}
                  </button>
                </div>
              </div>
            </div>

            {/* 搜索过滤器和视图控制 */}
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">所有类型</option>
                    <option value="image">图片</option>
                    <option value="video">视频</option>
                    <option value="audio">音频</option>
                    <option value="document">文档</option>
                    <option value="archive">压缩包</option>
                  </select>
                  <span className="text-sm text-gray-500">
                    找到 {searchResults.length} 个文件
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* 搜索结果 */}
            {searchResults.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {searchResults.map((file) => (
                  <div key={file.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {file.original_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {file.description || '无描述'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{file.author_name}</span>
                          <span>•</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-4">
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            下载
                          </a>
                          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <Share2 className="w-4 h-4 mr-1" />
                            分享
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关文件</h3>
                <p className="text-gray-500">尝试使用不同的关键词或检查拼写</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">开始搜索文件</h3>
                <p className="text-gray-500">输入文件名、描述或标签来搜索文件</p>
              </div>
            )}
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            {/* 广告已移除，仅保留主页广告 */}
          </div>
        </div>
      </main>
    </div>
  )
} 