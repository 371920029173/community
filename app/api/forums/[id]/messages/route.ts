import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 获取消息列表
export async function GET(
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

    // 检查是否是成员或所有者
    const { data: forum } = await supabaseAdmin
      .from('forums')
      .select('owner_id')
      .eq('id', forumId)
      .single()

    if (!forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    const isOwner = forum.owner_id === authUser.id

    if (!isOwner) {
      const { data: member } = await supabaseAdmin
        .from('forum_members')
        .select('id')
        .eq('forum_id', forumId)
        .eq('user_id', authUser.id)
        .single()

      if (!member) {
        return NextResponse.json({ success: false, error: '您不是论坛成员' }, { status: 403 })
      }
    }

    // 获取消息列表
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('forum_messages')
      .select(`
        id,
        content,
        message_type,
        created_at,
        sender:users!forum_messages_sender_id_fkey (
          id,
          username,
          nickname,
          avatar_url,
          nickname_color
        ),
        file:files!forum_messages_file_id_fkey (
          id,
          original_name,
          file_url
        )
      `)
      .eq('forum_id', forumId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (messagesError) {
      console.error('获取消息失败:', messagesError)
      return NextResponse.json({ success: false, error: messagesError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: messages || []
    })
  } catch (error: any) {
    console.error('获取消息API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

// 发送消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id: forumId } = await params
    const { content } = await request.json()

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查是否是成员或所有者
    const { data: forum } = await supabaseAdmin
      .from('forums')
      .select('owner_id, expires_at')
      .eq('id', forumId)
      .single()

    if (!forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    if (new Date(forum.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: '论坛已过期' }, { status: 410 })
    }

    const isOwner = forum.owner_id === authUser.id

    if (!isOwner) {
      const { data: member } = await supabaseAdmin
        .from('forum_members')
        .select('id')
        .eq('forum_id', forumId)
        .eq('user_id', authUser.id)
        .single()

      if (!member) {
        return NextResponse.json({ success: false, error: '请先加入论坛' }, { status: 403 })
      }
    }

    // 发送消息
    const { data: message, error: messageError } = await supabaseAdmin
      .from('forum_messages')
      .insert({
        forum_id: forumId,
        sender_id: authUser.id,
        content: content.trim(),
        message_type: 'text'
      })
      .select(`
        id,
        content,
        message_type,
        created_at,
        sender:users!forum_messages_sender_id_fkey (
          id,
          username,
          nickname,
          avatar_url,
          nickname_color
        )
      `)
      .single()

    if (messageError) {
      console.error('发送消息失败:', messageError)
      return NextResponse.json({ success: false, error: messageError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: message
    })
  } catch (error: any) {
    console.error('发送消息API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '发送失败' }, { status: 500 })
  }
}

