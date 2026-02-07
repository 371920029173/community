import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** 获取单个会话的详情（other_user + last_message），用于联系人列表渐进式加载 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) {
      return NextResponse.json({ success: false, error: '缺少 conversationId' }, { status: 400 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
    }

    const userId = user.id

    const { data: conv, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, user1_id, user2_id, last_message_at, title')
      .eq('id', conversationId)
      .single()

    if (convError || !conv) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 })
    }

    if (conv.user1_id !== userId && conv.user2_id !== userId) {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id

    const [{ data: otherUser }, { data: lastMessage }] = await Promise.all([
      supabaseAdmin.from('users').select('id, username, nickname, nickname_color, avatar_url').eq('id', otherUserId).single(),
      supabaseAdmin.from('messages').select('content, sent_at').eq('conversation_id', conv.id).order('sent_at', { ascending: false }).limit(1).maybeSingle()
    ])

    if (!otherUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conv.id,
        other_user: {
          id: otherUser.id,
          username: otherUser.username,
          nickname: otherUser.nickname,
          nickname_color: otherUser.nickname_color,
          avatar_url: otherUser.avatar_url
        },
        last_message: lastMessage || null,
        last_message_at: conv.last_message_at,
        title: conv.title
      }
    })
  } catch (e: unknown) {
    console.error('conversation-details error:', e)
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
