import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function getMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// 执行月度归档：将上月有礼品卷的用户写入 history，清零 gift_vouchers（每月只执行一次）
async function runMonthlyReset(sb: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = getMonthStr(lastMonth)

  const { data: existing } = await sb.from('gift_voucher_history').select('id').eq('month', monthStr).limit(1).maybeSingle()
  if (existing) return

  const { data: users } = await sb
    .from('users')
    .select('id, username, gift_vouchers')
    .gt('gift_vouchers', 0)

  if (!users || users.length === 0) return

  for (const u of users) {
    const count = u.gift_vouchers ?? 0
    if (count > 0) {
      await sb.from('gift_voucher_history').upsert({
        user_id: u.id,
        username: u.username,
        vouchers_count: count,
        month: monthStr
      }, { onConflict: 'user_id,month' })
    }
  }

  await sb.from('users').update({ gift_vouchers: 0 }).gt('gift_vouchers', 0)

  // 删除超过3个月的记录
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const cutoff = getMonthStr(threeMonthsAgo)
  await sb.from('gift_voucher_history').delete().lt('month', cutoff)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const sb = await getSupabaseAdmin()
    const { data: adminRow } = await sb.from('users').select('username').eq('id', user.id).single()
    if (!adminRow || adminRow.username !== '371920029173') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const now = new Date()
    if (now.getDate() === 1) {
      await runMonthlyReset(sb)
    }

    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const cutoff = getMonthStr(threeMonthsAgo)

    const { data: history } = await sb
      .from('gift_voucher_history')
      .select('*')
      .gte('month', cutoff)
      .order('month', { ascending: false })
      .order('vouchers_count', { ascending: false })

    return NextResponse.json({
      success: true,
      history: history || []
    })
  } catch (e: unknown) {
    console.error('admin gift-vouchers GET:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const sb = await getSupabaseAdmin()
    const { data: adminRow } = await sb.from('users').select('username').eq('id', user.id).single()
    if (!adminRow || adminRow.username !== '371920029173') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const targetUserId = body.userId as string
    const allowed = body.allowed === true

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 })
    }

    const { error } = await sb
      .from('users')
      .update({ gift_vouchers_allowed: allowed })
      .eq('id', targetUserId)

    if (error) {
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, allowed })
  } catch (e: unknown) {
    console.error('admin gift-vouchers PATCH:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
