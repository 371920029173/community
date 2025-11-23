import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 标记对话中的所有消息为已读
export async function POST(request: NextRequest) {
  try {
    const { conversationId, userId } = await request.json()

    if (!conversationId || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await getSupabaseAdmin()

    // 将该对话中所有接收者为当前用户的消息标记为已读
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('标记消息已读失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '消息已标记为已读'
    })

  } catch (error: any) {
    console.error('标记消息已读失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '标记失败' },
      { status: 500 }
    )
  }
}

