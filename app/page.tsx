'use client'

import { useState, useEffect } from 'react'
import { TopAdBanner } from '@/components/ads/AdBanner'
import { BottomAdBanner } from '@/components/ads/AdBanner'
import Navbar from '@/components/layout/Navbar'
import FileGrid from '@/components/files/FileGrid'
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner'
import { useAuth } from '@/components/providers/AuthProvider'
import { 
  Upload, 
  Search, 
  Users, 
  FileText, 
  Star, 
  TrendingUp, 
  Zap,
  Shield,
  Globe,
  Heart,
  Download,
  Eye,
  FolderOpen,
  MessageSquare,
  Sparkles,
  Calendar,
  Crown
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { user } = useAuth()
  const [forumPreview, setForumPreview] = useState<any[]>([])
  const [loadingForums, setLoadingForums] = useState(true)
  // 实时功能入口
  const quickActions = [
    {
      title: '云盘管理',
      description: '管理您的文件和文件夹',
      icon: FolderOpen,
      href: '/files',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: '上传文件',
      description: '分享您的文件资源',
      icon: Upload,
      href: '/upload',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: '搜索文件',
      description: '快速找到需要的内容',
      icon: Search,
      href: '/search',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ]

  const features = [
    {
      title: '云盘管理',
      description: '智能云盘管理，为您提供高效的文件存储和组织服务',
      icon: FolderOpen,
      color: 'from-purple-500 to-pink-500',
      href: '/files'
    },
    {
      title: '私信系统',
      description: '与朋友和同事进行私密交流，分享文件和想法',
      icon: MessageSquare,
      color: 'from-red-500 to-pink-500',
      href: '/messages'
    },
    {
      title: '占卜系统',
      description: '有趣的占卜功能，为您的文件分享之旅增添乐趣和随机性',
      icon: Sparkles,
      color: 'from-yellow-500 to-orange-500',
      href: '/fortune'
    },
    {
      title: '安全可靠',
      description: '企业级安全防护，确保您的文件和个人信息安全',
      icon: Shield,
      color: 'from-green-500 to-blue-500',
      href: '#'
    }
  ]

  // 获取论坛预览
  useEffect(() => {
    const fetchForumPreview = async () => {
      try {
        setLoadingForums(true)
        const response = await fetch('/api/forums/list?public=true')
        const result = await response.json()
        if (result.success) {
          setForumPreview(result.data?.slice(0, 3) || [])
        }
      } catch (error) {
        console.error('获取论坛预览失败:', error)
      } finally {
        setLoadingForums(false)
      }
    }

    fetchForumPreview()
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) {
      return '已过期'
    } else if (days === 0) {
      return '今天过期'
    } else if (days <= 5) {
      return `${days}天后过期`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <TopAdBanner />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* 配置警告 */}
        
        {/* 公告栏 */}
        <AnnouncementBanner />
        
        {/* 主要内容 */}
        <div className="mb-12">
          {/* 标题部分 - 左对齐，距离左边界200px */}
          <div className="mb-[200px]" style={{ marginLeft: '200px', maxWidth: 'max-content' }}>
            <h1 className="text-5xl font-bold text-left" style={{
              fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
              fontWeight: 600,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '10px'
            }}>
              资源同频
            </h1>
            <p className="text-xl text-gray-600 text-left leading-relaxed" style={{ fontWeight: 'normal' }}>
              资源与你同频，信息予你无限
            </p>
          </div>
          
          {/* 快速操作按钮 - 居中 */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="btn-elegant flex items-center gap-2"
              >
                <action.icon className="w-5 h-5" />
                <span>{action.title}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 特色功能 */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">平台特色功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group card-minimal p-6 hover-lift"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 论坛大厅映射窗口 */}
        <div className="mb-12">
          <div className="card-minimal p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                <Users className="w-6 h-6 mr-2 text-slate-600" />
                论坛大厅
              </h2>
              <Link href="/forums" className="text-blue-600 hover:text-blue-700 font-medium">
                查看全部 →
              </Link>
            </div>
            <div id="forum-preview" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loadingForums ? (
                <div className="p-4 bg-slate-50/50 backdrop-blur-sm rounded-xl border border-slate-200/50 text-center text-slate-500">
                  加载中...
                </div>
              ) : forumPreview.length === 0 ? (
                <div className="p-4 bg-slate-50/50 backdrop-blur-sm rounded-xl border border-slate-200/50 text-center text-slate-500">
                  暂无论坛
                </div>
              ) : (
                forumPreview.map((forum) => (
                  <Link
                    key={forum.id}
                    href={`/forums/${forum.id}`}
                    className="p-4 bg-slate-50/50 backdrop-blur-sm rounded-xl border border-slate-200/50 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-slate-800 flex-1 truncate">{forum.title}</h3>
                      {forum.owner_id === user?.id && (
                        <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {forum.current_topic && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{forum.current_topic}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{forum.owner?.nickname || forum.owner?.username}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTime(forum.expires_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 文件网格 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">最新文件</h2>
            <Link href="/share" className="text-blue-600 hover:text-blue-700 font-medium">
              浏览全部文件 →
            </Link>
          </div>
        <FileGrid />
        </div>
      </main>

      <BottomAdBanner />
    </div>
  )
} 