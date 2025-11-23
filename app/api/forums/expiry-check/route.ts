import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 检查论坛到期并发送提醒
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const now = new Date()
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

    // 查找5天内即将过期的论坛
    const { data: expiringForums, error: expiringError } = await supabaseAdmin
      .from('forums')
      .select(`
        id,
        title,
        owner_id,
        expires_at,
        owner:users!forums_owner_id_fkey (
          id,
          username,
          email
        )
      `)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', fiveDaysLater.toISOString())

    if (expiringError) {
      console.error('查询即将过期的论坛失败:', expiringError)
      return NextResponse.json({ success: false, error: expiringError.message }, { status: 500 })
    }

    // 检查每个论坛是否已发送提醒
    const remindersToSend: any[] = []
    
    for (const forum of expiringForums || []) {
      const daysUntilExpiry = Math.ceil(
        (new Date(forum.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 检查是否已发送过此类型的提醒
      const { data: existingReminder } = await supabaseAdmin
        .from('forum_expiry_reminders')
        .select('id')
        .eq('forum_id', forum.id)
        .eq('days_until_expiry', daysUntilExpiry)
        .single()

      if (!existingReminder) {
        remindersToSend.push({
          forum_id: forum.id,
          user_id: forum.owner_id,
          days_until_expiry: daysUntilExpiry,
          forum_title: forum.title
        })
      }
    }

    // 记录提醒（实际应用中，这里可以发送邮件或推送通知）
    if (remindersToSend.length > 0) {
      const reminderRecords = remindersToSend.map(r => ({
        forum_id: r.forum_id,
        user_id: r.user_id,
        days_until_expiry: r.days_until_expiry
      }))

      await supabaseAdmin.from('forum_expiry_reminders').insert(reminderRecords)
    }

    // 删除已过期的论坛
    const { error: deleteError } = await supabaseAdmin
      .from('forums')
      .delete()
      .lt('expires_at', now.toISOString())

    if (deleteError) {
      console.error('删除过期论坛失败:', deleteError)
    }

    return NextResponse.json({
      success: true,
      expiringForums: expiringForums?.length || 0,
      remindersSent: remindersToSend.length,
      reminders: remindersToSend
    })
  } catch (error: any) {
    console.error('论坛到期检查API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '检查失败' }, { status: 500 })
  }
}

