import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

const LOGIN_COINS = 5
const STAY_MINUTES = 10
const STAY_COINS = 5

function todayUTC(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const staySeconds = typeof body.staySeconds === 'number' ? Math.max(0, body.staySeconds) : 0

    const today = todayUTC()

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('user_daily_rewards')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('reward_date', today)
      .maybeSingle()

    if (fetchErr) {
      console.error('查询每日奖励失败:', fetchErr)
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }

    let record = existing
    if (!record) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('user_daily_rewards')
        .insert({
          user_id: authUser.id,
          reward_date: today,
          total_stay_seconds: staySeconds,
          login_coins_given: false,
          stay_coins_given: false
        })
        .select()
        .single()
      if (insErr) {
        console.error('创建每日奖励记录失败:', insErr)
        return NextResponse.json({ success: false, error: insErr.message }, { status: 500 })
      }
      record = inserted
    } else if (staySeconds > 0) {
      const newTotal = (record.total_stay_seconds || 0) + staySeconds
      await supabaseAdmin
        .from('user_daily_rewards')
        .update({ total_stay_seconds: newTotal, updated_at: new Date().toISOString() })
        .eq('user_id', authUser.id)
        .eq('reward_date', today)
      record = { ...record, total_stay_seconds: newTotal }
    }

    const totalStay = record.total_stay_seconds || 0
    const loginGiven = !!record.login_coins_given
    const stayGiven = !!record.stay_coins_given

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('sand_coins')
      .eq('id', authUser.id)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ success: false, error: '获取用户失败' }, { status: 500 })
    }

    let coinsToAdd = 0
    const updates: { login_coins_given?: boolean; stay_coins_given?: boolean } = {}

    if (!loginGiven) {
      coinsToAdd += LOGIN_COINS
      updates.login_coins_given = true
    }
    if (!stayGiven && totalStay >= STAY_MINUTES * 60) {
      coinsToAdd += STAY_COINS
      updates.stay_coins_given = true
    }

    if (coinsToAdd > 0) {
      const newCoins = (userRow.sand_coins || 0) + coinsToAdd
      await supabaseAdmin.from('users').update({ sand_coins: newCoins }).eq('id', authUser.id)
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('user_daily_rewards')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', authUser.id)
          .eq('reward_date', today)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        loginCoinsGiven: loginGiven || !!updates.login_coins_given,
        stayCoinsGiven: stayGiven || !!updates.stay_coins_given,
        totalStaySeconds: totalStay,
        coinsAdded: coinsToAdd,
        coins: (userRow.sand_coins || 0) + coinsToAdd
      }
    })
  } catch (error: any) {
    console.error('每日奖励API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '请求失败' }, { status: 500 })
  }
}
