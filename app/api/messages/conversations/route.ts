import { NextRequest, NextResponse } from 'next/server'

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
        { success: false, error: '未授权访�? },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信�?    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令�? },
        { status: 401 }
      )
    }

    const userId = user.id

    // 获取用户的对话列�?- 使用简单的查询，不依赖外键约束名称
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

    // 获取对话中的用户信息和最后消�?    const processedConversations = []
    
    for (const conv of conversations || []) {
      try {
        // 获取其他用户信息（不是当前用户）
        const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id
        const { data: otherUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, nickname, nickname_color, avatar_url')
          .eq('id', otherUserId)
          .single()

        if (userError) {
          console.error(`获取用户 ${otherUserId} 信息失败:`, userError)
          continue
        }

        // 获取最后一条消�?        const { data: lastMessage, error: msgError } = await supabaseAdmin
          .from('messages')
          .select('content, sent_at')
          .eq('conversation_id', conv.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        if (msgError && msgError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`获取对话 ${conv.id} 最后消息失�?`, msgError)
        }

        // 确保显示的是其他用户的用户名，而不是当前用�?        const displayUsername = otherUser.nickname || otherUser.username || 'Unknown'
        
        console.log(`对话 ${conv.id} 的用户信�?`, {
          currentUserId: userId,
          otherUserId: otherUserId,
          otherUserData: otherUser,
          displayUsername: displayUsername
        })
        
        processedConversations.push({
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
        })
      } catch (error) {
        console.error(`处理对话 ${conv.id} 失败:`, error)
        continue
      }
    }

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
        { success: false, error: '未授权访�? },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信�?    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令�? },
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

    // 校验接收者是否存�?    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', otherUserId)
      .single()

    if (targetErr || !targetUser) {
      return NextResponse.json({ success: false, error: '目标用户不存�? }, { status: 400 })
    }

    // 检查是否已有对�?    const { data: existingConv, error: existErr } = await supabaseAdmin
      .from('conversations')
      .select('id, user1_id, user2_id')
      .or(`and(user1_id.eq.${senderId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${senderId})`)
      .maybeSingle()

    if (!existErr && existingConv) {
      // 对话已存在，返回现有对话
      return NextResponse.json({
        success: true,
        conversation: existingConv,
        message: '对话已存�?
      })
    }

    // 创建新对�?    const [u1, u2] = senderId < otherUserId ? [senderId, otherUserId] : [otherUserId, senderId]

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
