import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id: forumId } = await params

    const supabaseAdmin = await getSupabaseAdmin()

    // 获取论坛详情
    const { data: forum, error: forumError } = await supabaseAdmin
      .from('forums')
      .select(`
        id,
        title,
        description,
        current_topic,
        announcement,
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
      .eq('id', forumId)
      .single()

    if (forumError || !forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    // 检查是否过期
    if (new Date(forum.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: '论坛已过期' }, { status: 410 })
    }

    // 检查是否隐藏（非所有者不能查看隐藏的论坛）
    let isOwner = false
    let isMember = false

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token)
      
      if (authUser) {
        isOwner = forum.owner_id === authUser.id
        
        // 检查是否是成员
        const { data: member } = await supabaseAdmin
          .from('forum_members')
          .select('id')
          .eq('forum_id', forumId)
          .eq('user_id', authUser.id)
          .single()
        
        isMember = !!member
      }
    }

    // 非所有者不能查看隐藏的论坛
    if (forum.is_hidden && !isOwner) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        forum,
        isOwner,
        isMember
      }
    })
  } catch (error: any) {
    console.error('获取论坛详情API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

