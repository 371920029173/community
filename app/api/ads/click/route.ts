import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 每次有效点击奖励5个沙币
const COINS_PER_CLICK = 5
// 每天每个位置只能奖励一次
const DAILY_LIMIT_PER_POSITION = 1

export async function POST(request: NextRequest) {
  try {
    const { position, userAgent, timestamp } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    if (!position || !['top', 'sidebar', 'bottom'].includes(position)) {
      return NextResponse.json({ success: false, error: '无效的广告位置' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查今天是否已经点击过这个位置的广告
    const today = new Date().toISOString().split('T')[0]
    const { data: existingClick } = await supabaseAdmin
      .from('ad_clicks')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('ad_position', position)
      .eq('click_date', today)
      .single()

    if (existingClick) {
      return NextResponse.json({ 
        success: false, 
        error: '今天已经点击过此位置的广告',
        alreadyClicked: true
      }, { status: 429 })
    }

    // 验证点击有效性（简单验证：检查时间戳是否在合理范围内）
    const clickTime = timestamp ? new Date(timestamp) : new Date()
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - clickTime.getTime())

    // 如果时间差超过5分钟，认为可能是无效点击
    if (timeDiff > 5 * 60 * 1000) {
      return NextResponse.json({ success: false, error: '点击时间无效' }, { status: 400 })
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
      await supabaseAdmin.from('ad_clicks').delete().eq('user_id', authUser.id).eq('ad_position', position).gte('click_timestamp', `${today}T00:00:00.000Z`)
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

