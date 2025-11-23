import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 获取用户的论坛到期提醒
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser || authUser.id !== userId) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 获取用户论坛的到期提醒
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('forum_expiry_reminders')
      .select(`
        id,
        days_until_expiry,
        reminder_sent_at,
        forum:forums!forum_expiry_reminders_forum_id_fkey (
          id,
          title,
          expires_at
        )
      `)
      .eq('user_id', userId)
      .order('reminder_sent_at', { ascending: false })
      .limit(10)

    if (remindersError) {
      console.error('获取提醒失败:', remindersError)
      return NextResponse.json({ success: false, error: remindersError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: reminders || []
    })
  } catch (error: any) {
    console.error('获取到期提醒API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

