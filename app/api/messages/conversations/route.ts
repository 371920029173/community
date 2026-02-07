import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 获取用户的对话列表 - 使用简单的查询，不依赖外键约束名称
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        title,
        last_message_at,
        created_at,
        updated_at
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('获取对话列表失败:', error)
      throw error
    }

    // 批量获取其他用户信息
    const convList = conversations || []
    const otherUserIds = Array.from(new Set(convList.map((c: { user1_id: string; user2_id: string }) =>
      c.user1_id === userId ? c.user2_id : c.user1_id
    )))
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select('id, username, nickname, nickname_color, avatar_url')
      .in('id', otherUserIds)
    const userMap = Object.fromEntries((usersData || []).map((u: { id: string }) => [u.id, u]))

    // 并行获取每个对话的最后一条消息
    const convsWithDetails = await Promise.all(convList.map(async (conv: { id: string; user1_id: string; user2_id: string; last_message_at: string; title?: string }) => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id
      const otherUser = userMap[otherUserId]
      if (!otherUser) return null

      const { data: lastMessage } = await supabaseAdmin
        .from('messages')
        .select('content, sent_at')
        .eq('conversation_id', conv.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
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
    }))

    const processedConversations = convsWithDetails.filter(Boolean)

    return NextResponse.json({
      success: true,
      conversations: processedConversations
    })

  } catch (error: any) {
    console.error('获取对话列表失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取认证token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const { otherUserId } = await request.json()
    
    if (!otherUserId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      )
    }

    const senderId = user.id

    // 校验接收者是否存在
    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', otherUserId)
      .single()

    if (targetErr || !targetUser) {
      return NextResponse.json({ success: false, error: '目标用户不存在' }, { status: 400 })
    }

    // 检查是否已有对话
    const { data: existingConv, error: existErr } = await supabaseAdmin
      .from('conversations')
      .select('id, user1_id, user2_id')
      .or(`and(user1_id.eq.${senderId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${senderId})`)
      .maybeSingle()

    if (!existErr && existingConv) {
      // 对话已存在，返回现有对话
      return NextResponse.json({
        success: true,
        conversation: existingConv,
        message: '对话已存在'
      })
    }

    // 创建新对话
    const [u1, u2] = senderId < otherUserId ? [senderId, otherUserId] : [otherUserId, senderId]

    const { data: newConversation, error: newConvError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user1_id: u1,
        user2_id: u2,
        title: `对话_${u1}_${u2}`,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (newConvError) {
      console.error('创建对话失败:', newConvError)
      return NextResponse.json(
        { success: false, error: '创建对话失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: newConversation,
      message: '对话创建成功'
    })

  } catch (error: any) {
    console.error('创建对话失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: 500 }
    )
  }
} 