import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('public') === 'true'

    const supabaseAdmin = await getSupabaseAdmin()

    // 构建查询：只显示未隐藏且未过期的论坛
    let query = supabaseAdmin
      .from('forums')
      .select(`
        id,
        title,
        description,
        current_topic,
        owner_id,
        expires_at,
        created_at,
        owner:users!forums_owner_id_fkey (
          id,
          username,
          nickname,
          avatar_url
        )
      `)
      .eq('is_hidden', false)
      .gt('expires_at', new Date().toISOString()) // 未过期
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: forums, error } = await query

    if (error) {
      console.error('获取论坛列表失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 获取每个论坛的成员数量
    const forumIds = forums?.map(f => f.id) || []
    const { data: memberCounts } = await supabaseAdmin
      .from('forum_members')
      .select('forum_id')
      .in('forum_id', forumIds)

    const memberCountMap: { [key: string]: number } = {}
    memberCounts?.forEach(m => {
      memberCountMap[m.forum_id] = (memberCountMap[m.forum_id] || 0) + 1
    })

    const forumsWithCounts = forums?.map(forum => ({
      ...forum,
      member_count: memberCountMap[forum.id] || 0
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: forumsWithCounts 
    })
  } catch (error: any) {
    console.error('获取论坛列表API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

