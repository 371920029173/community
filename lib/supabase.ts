import { createClient } from '@supabase/supabase-js'

// 生产环境配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 检查环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase环境变量未配置！')
  console.error('请创建 .env.local 文件并配置以下变量:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  console.error('当前值:')
  console.error('URL:', supabaseUrl || '未设置')
  console.error('KEY:', supabaseAnonKey ? '已设置' : '未设置')
  
  // 抛出错误，防止应用在错误配置下运行
  throw new Error('Supabase环境变量未配置，请检查.env.local文件')
}

// 验证URL格式
if (!supabaseUrl.includes('supabase.co')) {
  console.error('❌ Supabase URL格式错误:', supabaseUrl)
  throw new Error('Supabase URL格式错误，应该是 https://xxx.supabase.co 格式')
}

console.log('✅ Supabase配置正确:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 测试连接
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase连接测试失败:', error)
  } else {
    console.log('✅ Supabase连接测试成功')
  }
})

// 数据库类型定义
export interface User {
  id: string
  username: string
  email?: string
  avatar_url?: string
  nickname?: string
  nickname_color?: string
  is_admin: boolean
  is_moderator: boolean
  created_at: string
  storage_used: number
  storage_limit: number
}

export interface FileItem {
  id: string
  original_name: string
  filename: string
  file_path: string
  user_id: string
  file_size: number
  mime_type?: string
  file_hash?: string
  is_public: boolean
  is_approved: boolean
  download_count?: number
  created_at: string
  updated_at: string
  // 数据库中的额外字段（向后兼容）
  file_type?: string
  file_url?: string
  author_name?: string
  description?: string
  likes_count?: number
  comments_count?: number
  favorites_count?: number
}

export interface Comment {
  id: string
  file_id: string
  user_id: string
  username: string
  content: string
  created_at: string
  avatar_url?: string | null
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  content_type: 'text' | 'image' | 'video'
  media_url?: string
  created_at: string
  is_recalled: boolean
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  author_id?: string
  author_name?: string
  created_by?: string
  user_id?: string  // 数据库实际使用 user_id
  is_active: boolean
  expires_at?: string
  created_at: string
}

export interface FortuneResult {
  id: string
  user_id: string
  result: '大吉' | '中吉' | '小吉' | '中平' | '凶' | '大凶'
  date: string
  created_at: string
} 