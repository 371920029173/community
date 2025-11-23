'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import { TopAdBanner, BottomAdBanner } from '@/components/ads/AdBanner'
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Search, 
  User, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Code,
  Download,
  ExternalLink,
  X,
  Eye,
  Paperclip,
  File
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { getFriendlyErrorMessage } from '@/lib/utils'

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

interface User {
  id: string
  username: string
  nickname?: string
  nickname_color?: string
  avatar_url?: string
}

interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  last_message_at: string
  other_user?: User
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  file_name?: string
  file_type?: string
  file_url?: string
  file_size?: number
  file_id?: string
  created_at: string
  sender?: User
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({}) // 每个对话的未读消息数

  // 获取会话列表
  const fetchConversations = async () => {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('会话列表API响应:', data)
        if (data.success) {
          console.log('设置会话列表:', data.conversations)
          setConversations(data.conversations || [])
        }
      } else {
        toast.error('获取会话列表失败')
      }
    } catch (error) {
      console.error('获取会话列表失败:', error)
      toast.error('获取会话列表失败')
    }
  }

  // 发送消息
  const sendMessage = async () => {
    if ((!inputMessage.trim() && !selectedFile) || !selectedConversation || !user) {
      console.log('发送消息条件检查失败:', {
        hasMessage: !!inputMessage.trim(),
        hasFile: !!selectedFile,
        hasConversation: !!selectedConversation,
        hasUser: !!user
      })
      return
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('当前会话状态:', { session: !!session, userId: session?.user?.id })
      
      if (!session) {
        toast.error('会话已过期，请重新登录')
        return
      }

      let messageData: any = {
        conversationId: selectedConversation.id,
        content: inputMessage.trim() || '',
        messageType: selectedFile ? 'file' : 'text',
        senderId: user.id,
        receiverId: selectedConversation.other_user?.id // 添加接收者ID
      }

      // 如果有文件，先上传文件
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('userId', user.id)
        formData.append('isPublic', 'false')
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          console.error('文件上传失败:', uploadError)
          toast.error(uploadError.error || '文件上传失败')
          return
        }
        
        const uploadData = await uploadResponse.json()
        console.log('文件上传成功:', uploadData)
        
        if (uploadData.success && uploadData.data && uploadData.data.file) {
          messageData.fileName = uploadData.data.file.original_name
          messageData.fileType = getFileType(uploadData.data.file.original_name)
          messageData.fileUrl = uploadData.data.url // 使用正确的URL字段
          messageData.fileId = uploadData.data.file.id // 添加文件ID
          messageData.fileSize = uploadData.data.file.file_size
          messageData.mimeType = uploadData.data.file.mime_type // 使用正确的mime_type字段
        }
      }

      console.log('发送消息数据:', messageData)
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(messageData)
      })
      
      console.log('消息发送响应状态:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('消息发送API响应:', data)
        
        if (data.success && data.data && data.data.message) {
          // 更新消息列表
          setMessages(prev => [...prev, data.data.message])
          
          // 更新会话列表中的最后消息时间
          setConversations(prev => prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, last_message_at: new Date().toISOString() }
              : conv
          ))
          
          toast.success('消息发送成功')
          // 清空输入和文件选择
          setInputMessage('')
          setSelectedFile(null)
        } else {
          toast.error(data.message || '消息发送失败')
        }
      } else {
        const error = await response.json()
          toast.error(getFriendlyErrorMessage(error) || '消息发送失败')
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      toast.error(getFriendlyErrorMessage(error) || '发送消息失败')
    } finally {
      // 确保在finally中也清空状态
      if (inputMessage.trim() || selectedFile) {
        setInputMessage('')
        setSelectedFile(null)
      }
    }
  }

  // 获取消息列表
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/messages/history?conversationId=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const messageList = data.data || []
          setMessages(messageList)
          console.log('获取到的消息:', messageList)
          
          // 标记当前对话的消息为已读（清除未读数）
          if (selectedConversation?.id === conversationId) {
            setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }))
          }
        }
      }
    } catch (error) {
      console.error('获取消息失败:', error)
    }
  }

  // 获取所有对话的未读消息数
  const fetchUnreadCounts = async () => {
    if (!user?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 直接查询未读消息，按对话分组统计
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('获取未读消息失败:', error)
        return
      }

      // 按对话分组统计未读数
      const unreadMap: {[key: string]: number} = {}
      if (unreadMessages) {
        unreadMessages.forEach((msg: any) => {
          unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
        })
      }
      
      setUnreadCounts(unreadMap)
    } catch (error) {
      console.error('获取未读数失败:', error)
    }
  }

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/messages/search-users?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSearchResults(data.users || [])
        }
      }
    } catch (error) {
      console.error('搜索用户失败:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 创建新会话
  const createConversation = async (otherUserId: string) => {
    try {
      console.log('开始创建会话，目标用户ID:', otherUserId)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('没有有效的会话')
        toast.error('请先登录')
        return
      }

      console.log('发送创建会话请求...')
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ otherUserId })
      })

      console.log('创建会话响应状态:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('创建会话响应数据:', data)
        
        if (data.success) {
          toast.success('对话创建成功')
          await fetchConversations()
          setShowNewChat(false)
          setSearchQuery('')
          setSearchResults([])
        } else {
          toast.error(data.error || '创建对话失败')
        }
      } else {
        const errorData = await response.json()
        console.error('创建会话失败:', errorData)
        toast.error(errorData.error || '创建对话失败')
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      toast.error('创建对话失败')
    }
  }

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />
    if (fileType.startsWith('audio/')) return <Music className="w-4 h-4" />
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-4 h-4" />
    if (fileType.includes('code') || fileType.includes('text')) return <Code className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    
    return date.toLocaleDateString()
  }

  // 过滤对话列表
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const username = conversation.other_user?.username?.toLowerCase() || ''
    const nickname = conversation.other_user?.nickname?.toLowerCase() || ''
    
    return username.includes(query) || nickname.includes(query)
  })

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  // 定期更新未读消息数（每15秒）
  useEffect(() => {
    if (!user) return

    // 立即获取一次
    fetchUnreadCounts()
    
    // 每15秒更新一次
    const interval = setInterval(fetchUnreadCounts, 15000)
    
    return () => clearInterval(interval)
  }, [user])

  // 当切换对话时，刷新未读数
  useEffect(() => {
    if (selectedConversation && user) {
      fetchUnreadCounts()
    }
  }, [selectedConversation?.id, user])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h1>
            <p className="text-gray-600">您需要登录才能使用私信功能</p>
          </div>
        </div>
      </div>
    )
  }

  // 判断是否有内容：有对话且已选择对话，或有消息
  const hasContent = selectedConversation !== null && messages.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <TopAdBanner hasContent={hasContent} />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          <div className="flex h-[calc(100vh-200px)]">
            {/* 左侧会话列表 */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50/50 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">私信</h2>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新对话
                  </button>
                </div>
                
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索已有联系人..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ 
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain'
                }}
                onWheel={(e) => {
                  // 确保滚动事件优先处理，阻止冒泡
                  e.stopPropagation()
                }}
                onTouchMove={(e) => {
                  // 移动端触摸滚动
                  e.stopPropagation()
                }}
              >
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {searchQuery.trim() ? `没有找到包含"${searchQuery}"的对话` : '暂无会话'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery.trim() ? '尝试其他关键词' : '开始您的第一次对话吧'}
                    </p>
                    {!searchQuery.trim() && (
                      <button
                        onClick={() => setShowNewChat(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        创建新对话
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredConversations.map((conversation) => {
                      const unreadCount = unreadCounts[conversation.id] || 0
                      return (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors relative ${
                            selectedConversation?.id === conversation.id
                              ? 'bg-blue-100 border border-blue-200'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {conversation.other_user?.avatar_url ? (
                                <img 
                                  src={conversation.other_user.avatar_url} 
                                  alt={conversation.other_user?.nickname || conversation.other_user?.username || '未知用户'}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                  {conversation.other_user?.nickname?.[0] || conversation.other_user?.username?.[0] || 'U'}
                                </div>
                              )}
                              <NotificationDot count={unreadCount} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium truncate ${unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-800'}`}>
                                {conversation.other_user?.nickname || conversation.other_user?.username || '未知用户'}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {formatTime(conversation.last_message_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧消息区域 */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* 消息头部 */}
                  <div className="p-4 border-b border-gray-200 bg-white/50">
                    <div className="flex items-center gap-3">
                      {selectedConversation.other_user?.avatar_url ? (
                        <img 
                          src={selectedConversation.other_user.avatar_url} 
                          alt={selectedConversation.other_user?.nickname || selectedConversation.other_user?.username || '未知用户'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedConversation.other_user?.nickname?.[0] || selectedConversation.other_user?.username?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {selectedConversation.other_user?.nickname || selectedConversation.other_user?.username || '未知用户'}
                        </h3>
                        <p className="text-sm text-gray-500">在线</p>
                      </div>
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>暂无消息</p>
                        <p className="text-sm">开始你们的对话吧</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            message.sender_id === user.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {message.message_type === 'file' && message.file_name ? (
                              <div className="space-y-2">
                                {/* 图片直接显示 */}
                                {message.file_type?.startsWith('image/') ? (
                                  <div className="space-y-2">
                                    {message.file_url ? (
                                      <img
                                        src={message.file_url}
                                        alt={message.file_name}
                                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(message.file_url, '_blank')}
                                      />
                                    ) : (
                                      <div className="p-4 bg-gray-100 rounded-lg text-center">
                                        <p className="text-gray-500">图片加载失败</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm opacity-75">
                                      {getFileIcon(message.file_type || '')}
                                      <span>{message.file_name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => window.open(`/message-file/${message.file_id || message.id}`, '_blank')}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        浏览
                                      </button>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = message.file_url || ''
                                          link.download = message.file_name || ''
                                          link.click()
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        下载
                                      </button>
                                    </div>
                                  </div>
                                ) : message.file_type?.startsWith('video/') ? (
                                  /* 视频直接显示 */
                                  <div className="space-y-2">
                                    {message.file_url ? (
                                      <video
                                        controls
                                        className="max-w-full h-auto rounded-lg"
                                        preload="metadata"
                                      >
                                        <source src={message.file_url} type={message.file_type} />
                                        您的浏览器不支持视频播放
                                      </video>
                                    ) : (
                                      <div className="p-4 bg-gray-100 rounded-lg text-center">
                                        <p className="text-gray-500">视频加载失败</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm opacity-75">
                                      {getFileIcon(message.file_type || '')}
                                      <span>{message.file_name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => window.open(`/message-file/${message.file_id || message.id}`, '_blank')}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        浏览
                                      </button>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = message.file_url || ''
                                          link.download = message.file_name || ''
                                          link.click()
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        下载
                                      </button>
                                    </div>
                                  </div>
                                ) : message.file_type?.startsWith('audio/') ? (
                                  /* 音频直接显示 */
                                  <div className="space-y-2">
                                    {message.file_url ? (
                                      <audio
                                        controls
                                        className="w-full"
                                        preload="metadata"
                                      >
                                        <source src={message.file_url} type={message.file_type} />
                                        您的浏览器不支持音频播放
                                      </audio>
                                    ) : (
                                      <div className="p-4 bg-gray-100 rounded-lg text-center">
                                        <p className="text-gray-500">音频加载失败</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm opacity-75">
                                      {getFileIcon(message.file_type || '')}
                                      <span>{message.file_name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => window.open(`/message-file/${message.file_id || message.id}`, '_blank')}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        浏览
                                      </button>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = message.file_url || ''
                                          link.download = message.file_name || ''
                                          link.click()
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        下载
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* 其他文件类型保持原样 */
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {getFileIcon(message.file_type || '')}
                                      <span className="font-medium">{message.file_name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => window.open(`/message-file/${message.file_id || message.id}`, '_blank')}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        浏览
                                      </button>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = message.file_url || ''
                                          link.download = message.file_name || ''
                                          link.click()
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
                                      >
                                        <Download className="w-3 h-3" />
                                        下载
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>{message.content}</div>
                            )}
                            <div className="text-xs opacity-75 mt-1">
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 消息输入框 */}
                  <div className="p-4 border-t border-gray-200 bg-white/50">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="file-input"
                        onChange={(e) => {
                          setSelectedFile(e.target.files?.[0] || null)
                          // 清空input value，确保可以重复选择同一个文件
                          e.target.value = ''
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-input"
                        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-600" />
                      </label>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="输入消息..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!inputMessage.trim() && !selectedFile}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {selectedFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>{selectedFile.name}</span>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <MessageSquare className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">请选择一个对话</h3>
                    <p className="text-gray-600">从左侧选择一个会话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 新对话模态框 */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">新对话</h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  搜索用户
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="输入用户名或昵称..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {isSearching && (
                <div className="text-center text-gray-500 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2">搜索中...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      onClick={() => createConversation(searchUser.id)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      {searchUser.avatar_url ? (
                        <img 
                          src={searchUser.avatar_url} 
                          alt={searchUser.nickname || searchUser.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {searchUser.nickname?.[0] || searchUser.username[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {searchUser.nickname || searchUser.username}
                        </h4>
                        <p className="text-sm text-gray-500">@{searchUser.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>未找到用户</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomAdBanner hasContent={hasContent} />
    </div>
  )
}
