import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

const EXCHANGE_RATE = 5  // 5 沙币 = 1 铒币
const PLAY_COST = 1
const GOAL_REWARD = 2

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const sb = await getSupabaseAdmin()
    const { data: row, error } = await sb
      .from('users')
      .select('sand_coins, game_coins')
      .eq('id', user.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sandCoins: row.sand_coins ?? 0,
      gameCoins: row.game_coins ?? 0
    })
  } catch (e: unknown) {
    console.error('games currency GET:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action as string
    const sb = await getSupabaseAdmin()

    if (action === 'exchange') {
      const amount = Math.floor(Number(body.amount) || 0)
      if (amount < 1) {
        return NextResponse.json({ success: false, error: '兑换数量至少 1 铒币' }, { status: 400 })
      }
      const sandCost = amount * EXCHANGE_RATE

      const { data: row, error: fetchErr } = await sb
        .from('users')
        .select('sand_coins, game_coins')
        .eq('id', user.id)
        .single()

      if (fetchErr || !row) {
        return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
      }

      const sandCoins = row.sand_coins ?? 0
      const gameCoins = row.game_coins ?? 0

      if (sandCoins < sandCost) {
        return NextResponse.json({
          success: false,
          error: `沙币不足，需要 ${sandCost} 沙币（5 沙币 = 1 铒币）`
        }, { status: 400 })
      }

      const { error: updateErr } = await sb
        .from('users')
        .update({
          sand_coins: sandCoins - sandCost,
          game_coins: gameCoins + amount
        })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ success: false, error: '兑换失败' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `成功兑换 ${amount} 铒币`,
        sandCoins: sandCoins - sandCost,
        gameCoins: gameCoins + amount
      })
    }

    if (action === 'play') {
      const { data: row, error: fetchErr } = await sb
        .from('users')
        .select('game_coins')
        .eq('id', user.id)
        .single()

      if (fetchErr || !row) {
        return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
      }

      const gameCoins = row.game_coins ?? 0
      if (gameCoins < PLAY_COST) {
        return NextResponse.json({
          success: false,
          error: `铒币不足，每次游戏消耗 ${PLAY_COST} 铒币。5 沙币可兑换 1 铒币。`
        }, { status: 400 })
      }

      const { error: updateErr } = await sb
        .from('users')
        .update({ game_coins: gameCoins - PLAY_COST })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ success: false, error: '扣除失败' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '开始游戏',
        gameCoins: gameCoins - PLAY_COST
      })
    }

    if (action === 'roulette_play') {
      const cost = 5
      const { data: row, error: fetchErr } = await sb
        .from('users')
        .select('game_coins')
        .eq('id', user.id)
        .single()

      if (fetchErr || !row) {
        return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
      }

      const gameCoins = row.game_coins ?? 0
      if (gameCoins < cost) {
        return NextResponse.json({
          success: false,
          error: `铒币不足，俄罗斯轮盘消耗 ${cost} 铒币`
        }, { status: 400 })
      }

      const { error: updateErr } = await sb
        .from('users')
        .update({ game_coins: gameCoins - cost })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ success: false, error: '扣除失败' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '开始游戏',
        gameCoins: gameCoins - cost
      })
    }

    if (action === 'roulette_win') {
      const amount = Math.floor(Number(body.amount) || 0)
      if (amount < 0) {
        return NextResponse.json({ success: false, error: '无效奖励' }, { status: 400 })
      }

      const { data: row, error: fetchErr } = await sb
        .from('users')
        .select('game_coins')
        .eq('id', user.id)
        .single()

      if (fetchErr || !row) {
        return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
      }

      const gameCoins = row.game_coins ?? 0
      const { error: updateErr } = await sb
        .from('users')
        .update({ game_coins: gameCoins + amount })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ success: false, error: '发放奖励失败' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `获得 ${amount} 铒币`,
        gameCoins: gameCoins + amount
      })
    }

    if (action === 'reward') {
      const { data: row, error: fetchErr } = await sb
        .from('users')
        .select('game_coins')
        .eq('id', user.id)
        .single()

      if (fetchErr || !row) {
        return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
      }

      const gameCoins = row.game_coins ?? 0
      const { error: updateErr } = await sb
        .from('users')
        .update({ game_coins: gameCoins + GOAL_REWARD })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ success: false, error: '发放奖励失败' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `达成目标！返还 ${GOAL_REWARD} 铒币`,
        gameCoins: gameCoins + GOAL_REWARD
      })
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 })
  } catch (e: unknown) {
    console.error('games currency POST:', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
