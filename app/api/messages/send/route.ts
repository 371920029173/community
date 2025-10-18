import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, otherUserId, content, messageType, receiverId, fileUrl, fileName, fileType, fileSize, mimeType } = await request.json()

    // 从请求头获取认证token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '缺少认证信息' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 401 }
      )
    }

    const senderId = user.id

    // 验证必需参数
    if (!content && !fileUrl) {
      return NextResponse.json(
        { success: false, error: '缺少消息内容或文件' },
        { status: 400 }
      )
    }

    // 如果没有conversationId，需要otherUserId来创建对话
    if (!conversationId && !otherUserId) {
      return NextResponse.json(
        { success: false, error: '缺少对话ID或用户ID' },
        { status: 400 }
      )
    }

    // 创建或获取对话
    let currentConversationId = conversationId
    let actualReceiverId = receiverId || otherUserId

    if (!currentConversationId) {
      // 校验接收者是否存在
      const { data: targetUser, error: targetErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', actualReceiverId)
        .single()

      if (targetErr || !targetUser) {
        return NextResponse.json({ success: false, error: '目标用户不存在' }, { status: 400 })
      }
      // 先查是否已有双向对话
      const { data: existingConv, error: existErr } = await supabaseAdmin
        .from('conversations')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${senderId},user2_id.eq.${actualReceiverId}),and(user1_id.eq.${actualReceiverId},user2_id.eq.${senderId})`)
        .maybeSingle()

      if (!existErr && existingConv) {
        currentConversationId = existingConv.id
      } else {
        // 使用规范顺序写入，避免唯一约束冲突（较小的 UUID 放 user1）
        const [u1, u2] = senderId < actualReceiverId ? [senderId, actualReceiverId] : [actualReceiverId, senderId]

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
          throw newConvError
        }
        currentConversationId = newConversation.id
      }
    } else {
      // 如果已有conversationId，从对话中获取otherUserId
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', currentConversationId)
        .single()

      if (convError) {
        console.error('获取对话信息失败:', convError)
        throw convError
      }

      // 验证发送者是否在对话中
      if (conversation.user1_id !== senderId && conversation.user2_id !== senderId) {
        return NextResponse.json(
          { success: false, error: '您不是此对话的参与者' },
          { status: 403 }
        )
      }

      // 确定接收者ID
      actualReceiverId = conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id
    }

    // 发送消息 - 支持文件和文本
    const messageData: any = {
      conversation_id: currentConversationId,
      sender_id: senderId,
      content: content || '',
      message_type: messageType || 'text',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 如果有文件信息，添加到消息中
    if (fileUrl) {
      messageData.file_url = fileUrl
      messageData.file_name = fileName
      messageData.file_type = fileType
      messageData.file_size = fileSize
      messageData.mime_type = mimeType
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select('*')
      .single()

    if (messageError) {
      console.error('发送消息失败:', messageError)
      throw messageError
    }

    // 更新对话最后消息时间
    await supabaseAdmin
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentConversationId)

    // 确保返回完整的消息对象
    const fullMessage = {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type,
      sent_at: message.sent_at,
      created_at: message.created_at,
      file_url: message.file_url,
      file_name: message.file_name,
      file_type: message.file_type,
      file_size: message.file_size
    }

    return NextResponse.json({
      success: true,
      data: {
        message: fullMessage,
        conversationId: currentConversationId
      }
    })

  } catch (error: any) {
    console.error('发送消息失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '发送失败' },
      { status: 500 }
    )
  }
} 