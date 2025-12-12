import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

/**
 * 获取用户未读私信总数
 * 这是一个专门的API，用于实时获取准确的未读消息数
 */
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

    // 使用 COUNT 查询，更高效且准确
    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('[unread-total] 查询失败:', error)
      // 如果 COUNT 查询失败，使用备用方案
      try {
        const { data: messages, error: fallbackError } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('receiver_id', userId)
          .eq('is_read', false)
          .limit(1000) // 限制查询数量，避免性能问题

        if (fallbackError) {
          throw fallbackError
        }

        const unreadCount = messages?.length || 0
        return NextResponse.json({
          success: true,
          count: unreadCount,
          timestamp: new Date().toISOString()
        })
      } catch (fallbackErr: any) {
        console.error('[unread-total] 备用查询也失败:', fallbackErr)
        return NextResponse.json(
          { success: false, error: '查询未读消息失败' },
          { status: 500 }
        )
      }
    }

    // 确保 count 不为 null
    const unreadCount = count ?? 0

    return NextResponse.json({
      success: true,
      count: unreadCount,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[unread-total] API错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
}

