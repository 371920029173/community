import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 获取用户所有对话的未读消息数（按对话分组）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await getSupabaseAdmin()

    // 查询所有未读消息
    const { data: unreadMessages, error } = await supabaseAdmin
      .from('messages')
      .select('conversation_id')
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('获取未读消息失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 按对话分组统计未读数
    const unreadMap: {[key: string]: number} = {}
    if (unreadMessages) {
      unreadMessages.forEach((msg: any) => {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
      })
    }

    return NextResponse.json({
      success: true,
      data: unreadMap
    })

  } catch (error: any) {
    console.error('获取未读数失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
}

