import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: '缺少对话ID' },
        { status: 400 }
      )
    }

    // 获取对话的消息历史
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: messages || []
    })

  } catch (error: any) {
    console.error('获取消息历史失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
} 