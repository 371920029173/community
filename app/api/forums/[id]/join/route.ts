import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id: forumId } = await params

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查论坛是否存在且未过期
    const { data: forum, error: forumError } = await supabaseAdmin
      .from('forums')
      .select('id, expires_at, is_hidden')
      .eq('id', forumId)
      .single()

    if (forumError || !forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    if (new Date(forum.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: '论坛已过期' }, { status: 410 })
    }

    if (forum.is_hidden) {
      return NextResponse.json({ success: false, error: '论坛已隐藏' }, { status: 403 })
    }

    // 检查是否已经是成员
    const { data: existingMember } = await supabaseAdmin
      .from('forum_members')
      .select('id')
      .eq('forum_id', forumId)
      .eq('user_id', authUser.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ success: true, message: '您已经是成员' })
    }

    // 加入论坛
    const { error: joinError } = await supabaseAdmin
      .from('forum_members')
      .insert({
        forum_id: forumId,
        user_id: authUser.id
      })

    if (joinError) {
      console.error('加入论坛失败:', joinError)
      return NextResponse.json({ success: false, error: joinError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('加入论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '加入失败' }, { status: 500 })
  }
}

