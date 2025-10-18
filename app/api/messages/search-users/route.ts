import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    console.log('搜索查询:', query) // 调试日志
    
    if (!query || query.length < 2) {
      console.log('查询太短，返回空结果') // 调试日志
      return NextResponse.json({ users: [] })
    }
    
    // 使用更安全的搜索方式，避免SQL注入
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, nickname, nickname_color, avatar_url')
      .or(`username.ilike.%${query}%,nickname.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('搜索用户数据库错误:', error) // 调试日志
      throw error
    }

    console.log('搜索结果数量:', users?.length || 0) // 调试日志
    console.log('搜索结果:', users) // 调试日志

    return NextResponse.json({ success: true, users: users || [] })
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
} 