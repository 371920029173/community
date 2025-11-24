'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import { SidebarAd } from '@/components/ads/AdBanner'
import { 
  Calendar,
  User,
  Tag,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface NewsItem {
  id: string
  title: string
  content: string
  author: string
  date: string
  category: string
  isImportant: boolean
}

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟获取新闻数据
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: '文件分享平台正式上线！',
        content: '我们很高兴地宣布，文件分享平台已经正式上线！现在您可以安全、便捷地分享各种类型的文件，包括图片、视频、音频、文档等。平台支持大文件上传，提供云盘存储功能，让您的文件管理更加高效。',
        author: '管理员',
        date: '2024-01-15',
        category: '平台公告',
        isImportant: true
      },
      {
        id: '2',
        title: '新增私信功能，支持用户间文件分享',
        content: '我们新增了私信功能，现在您可以与其他用户进行私密对话，并直接在对话中分享文件。这为团队协作和个人交流提供了更便捷的方式。',
        author: '开发团队',
        date: '2024-01-10',
        category: '功能更新',
        isImportant: false
      },
      {
        id: '3',
        title: '文件搜索功能优化完成',
        content: '我们对文件搜索功能进行了全面优化，现在支持按文件名、描述、作者等多种方式进行搜索，让您能够快速找到需要的文件。',
        author: '开发团队',
        date: '2024-01-05',
        category: '功能更新',
        isImportant: false
      },
      {
        id: '4',
        title: '云盘存储空间升级',
        content: '为了提供更好的服务，我们将免费用户的云盘存储空间从 1GB 升级到 10GB，付费用户可获得更大的存储空间。',
        author: '运营团队',
        date: '2024-01-01',
        category: '服务升级',
        isImportant: true
      }
    ]

    setTimeout(() => {
      setNewsItems(mockNews)
      setLoading(false)
    }, 1000)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '平台公告': return 'bg-red-100 text-red-800'
      case '功能更新': return 'bg-blue-100 text-blue-800'
      case '服务升级': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <SidebarAd hasContent={!loading && newsItems.length > 0} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {/* 页面标题 */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  返回首页
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">平台动态</h1>
                  <p className="text-gray-600 mt-1">了解最新的功能更新和平台动态</p>
                </div>
              </div>
            </div>

            {/* 新闻列表 */}
            <div className="space-y-6">
              {newsItems.map((item) => (
                <article key={item.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {item.title}
                        </h2>
                        {item.isImportant && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            重要
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {item.author}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(item.date)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                          <Tag className="w-3 h-3 mr-1" />
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {/* 加载更多按钮 */}
            <div className="mt-8 text-center">
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                加载更多动态
              </button>
            </div>
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            <SidebarAd hasContent={!loading && newsItems.length > 0} />
            
            {/* 分类导航 */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">分类浏览</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  全部动态
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  平台公告
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  功能更新
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  服务升级
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

