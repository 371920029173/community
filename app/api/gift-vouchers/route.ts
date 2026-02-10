import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

const COST_SAND = 50
const COST_GAME = 40

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

async function runMonthlyResetIfNeeded(sb: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const now = new Date()
  if (now.getDate() !== 1) return
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = getMonthStr(lastMonth)
  const { data: existing } = await sb.from('gift_voucher_history').select('id').eq('month', monthStr).limit(1).maybeSingle()
  if (existing) return
  const { data: users } = await sb.from('users').select('id, username, gift_vouchers').gt('gift_vouchers', 0)
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
}

export async function GET(request: NextRequest) {
  try {
    const sb = await getSupabaseAdmin()
    const user = await getAuthUser(request)

    if (!user?.id) {
      return NextResponse.json({ success: true, enabled: false })
    }

    await runMonthlyResetIfNeeded(sb)

    const { data: row } = await sb
      .from('users')
      .select('gift_vouchers, sand_coins, game_coins, gift_vouchers_allowed')
      .eq('id', user.id)
      .single()

    const allowed = row?.gift_vouchers_allowed === true
    if (!allowed) {
      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({
      success: true,
      enabled: true,
      vouchers: row?.gift_vouchers ?? 0,
      sandCoins: row?.sand_coins ?? 0,
      gameCoins: row?.game_coins ?? 0
    })
  } catch (e: unknown) {
    console.error('gift-vouchers GET:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const sb = await getSupabaseAdmin()
    await runMonthlyResetIfNeeded(sb)
    const { data: userRow } = await sb.from('users').select('gift_vouchers_allowed').eq('id', user.id).single()
    if (!userRow?.gift_vouchers_allowed) {
      return NextResponse.json({ success: false, error: '您的账号暂未开放礼品卷功能' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const type = body.type as 'sand' | 'game'
    const amount = Math.floor(Number(body.amount) || 1)

    if (!type || !['sand', 'game'].includes(type) || amount < 1) {
      return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 })
    }

    const { data: row } = await sb
      .from('users')
      .select('gift_vouchers, sand_coins, game_coins')
      .eq('id', user.id)
      .single()

    if (!row) {
      return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
    }

    const sandCoins = row.sand_coins ?? 0
    const gameCoins = row.game_coins ?? 0
    const cost = type === 'sand' ? COST_SAND * amount : COST_GAME * amount

    if (type === 'sand' && sandCoins < cost) {
      return NextResponse.json({ success: false, error: `沙币不足，需要 ${cost} 沙币（50沙币=1礼品卷）` }, { status: 400 })
    }
    if (type === 'game' && gameCoins < cost) {
      return NextResponse.json({ success: false, error: `铒币不足，需要 ${cost} 铒币（40铒币=1礼品卷）` }, { status: 400 })
    }

    const newVouchers = (row.gift_vouchers ?? 0) + amount
    const updates: Record<string, number> = { gift_vouchers: newVouchers }
    if (type === 'sand') updates.sand_coins = sandCoins - cost
    else updates.game_coins = gameCoins - cost

    const { error } = await sb.from('users').update(updates).eq('id', user.id)
    if (error) {
      return NextResponse.json({ success: false, error: '兑换失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      vouchers: newVouchers,
      sandCoins: type === 'sand' ? sandCoins - cost : sandCoins,
      gameCoins: type === 'game' ? gameCoins - cost : gameCoins
    })
  } catch (e: unknown) {
    console.error('gift-vouchers POST:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
