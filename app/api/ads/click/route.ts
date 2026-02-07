import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 每次有效点击奖励3个沙币
const COINS_PER_CLICK = 3
// 每天每个位置只能奖励一次
const DAILY_LIMIT_PER_POSITION = 1

export async function POST(request: NextRequest) {
  try {
    const { position, adSlotId, userAgent, timestamp } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    if (!position || !['top', 'sidebar', 'bottom'].includes(position)) {
      return NextResponse.json({ success: false, error: '无效的广告位置' }, { status: 400 })
    }

    // 验证广告单元ID（必须提供）
    if (!adSlotId || typeof adSlotId !== 'string') {
      return NextResponse.json({ success: false, error: '缺少广告单元ID' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查今天是否已经点击过这个具体的广告单元
    const today = new Date().toISOString().split('T')[0]
    const { data: existingClick } = await supabaseAdmin
      .from('ad_clicks')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('ad_slot_id', adSlotId)
      .eq('click_date', today)
      .single()

    if (existingClick) {
      return NextResponse.json({ 
        success: false, 
        error: '今天已经点击过此广告，请等待其他广告轮播',
        alreadyClicked: true
      }, { status: 429 })
    }

    // 验证点击有效性（按照Google AdSense要求严格验证）
    const clickTime = timestamp ? new Date(timestamp) : new Date()
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - clickTime.getTime())

    // 严格验证1：时间戳必须在30秒内（确保是实时点击，不是延迟或伪造）
    if (timeDiff > 30 * 1000) {
      return NextResponse.json({ success: false, error: '点击时间无效，请重新点击' }, { status: 400 })
    }

    // 严格验证2：检查用户最近是否有异常点击模式
    // 获取用户最近1小时内的点击记录
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const { data: recentClicks } = await supabaseAdmin
      .from('ad_clicks')
      .select('click_timestamp')
      .eq('user_id', authUser.id)
      .gte('click_timestamp', oneHourAgo.toISOString())
      .order('click_timestamp', { ascending: false })

    // 如果1小时内点击超过3次，可能是异常行为
    if (recentClicks && recentClicks.length >= 3) {
      return NextResponse.json({ 
        success: false, 
        error: '点击过于频繁，请稍后再试' 
      }, { status: 429 })
    }

    // 严格验证3：检查点击间隔（防止机器人快速点击）
    if (recentClicks && recentClicks.length > 0) {
      const lastClickTime = new Date(recentClicks[0].click_timestamp)
      const timeSinceLastClick = now.getTime() - lastClickTime.getTime()
      // 至少间隔30秒才能再次点击
      if (timeSinceLastClick < 30 * 1000) {
        return NextResponse.json({ 
          success: false, 
          error: '点击间隔太短，请稍后再试' 
        }, { status: 429 })
      }
    }

    // 获取用户当前沙币
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('sand_coins')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
    }

    // 记录点击并奖励沙币
      const { error: clickError } = await supabaseAdmin
      .from('ad_clicks')
      .insert({
        user_id: authUser.id,
        ad_position: position,
        ad_slot_id: adSlotId, // 记录具体的广告单元ID
        click_timestamp: clickTime.toISOString(),
        click_date: new Date().toISOString().split('T')[0], // 设置日期为今天（YYYY-MM-DD格式）
        is_valid: true,
        coins_awarded: COINS_PER_CLICK
      })

    if (clickError) {
      console.error('记录广告点击失败:', clickError)
      return NextResponse.json({ success: false, error: clickError.message }, { status: 500 })
    }

    // 更新用户沙币
    const { error: coinsError } = await supabaseAdmin
      .from('users')
      .update({ sand_coins: (user.sand_coins || 0) + COINS_PER_CLICK })
      .eq('id', authUser.id)

    if (coinsError) {
      console.error('更新沙币失败:', coinsError)
      // 回滚：删除点击记录
      await supabaseAdmin.from('ad_clicks').delete().eq('user_id', authUser.id).eq('ad_slot_id', adSlotId).gte('click_timestamp', `${today}T00:00:00.000Z`)
      return NextResponse.json({ success: false, error: '更新沙币失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      coinsAwarded: COINS_PER_CLICK,
      totalCoins: (user.sand_coins || 0) + COINS_PER_CLICK
    })
  } catch (error: any) {
    console.error('广告点击API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '处理失败' }, { status: 500 })
  }
}

