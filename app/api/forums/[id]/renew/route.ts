import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 续费需要25个沙币，延长30天
const RENEW_FORUM_COST = 25
const RENEW_DAYS = 30

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { id: forumId } = await params

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查论坛是否存在且用户是所有者
    const { data: forum, error: forumError } = await supabaseAdmin
      .from('forums')
      .select('owner_id, expires_at')
      .eq('id', forumId)
      .single()

    if (forumError || !forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    if (forum.owner_id !== authUser.id) {
      return NextResponse.json({ success: false, error: '您不是论坛所有者' }, { status: 403 })
    }

    // 检查用户沙币
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('sand_coins')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
    }

    if (user.sand_coins < RENEW_FORUM_COST) {
      return NextResponse.json({ 
        success: false, 
        error: `沙币不足，续费需要${RENEW_FORUM_COST}个沙币` 
      }, { status: 400 })
    }

    // 计算新的过期时间（从当前过期时间延长，如果已过期则从今天开始）
    const currentExpiry = new Date(forum.expires_at)
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate)
    newExpiry.setDate(newExpiry.getDate() + RENEW_DAYS)

    // 更新论坛过期时间
    const { error: updateError } = await supabaseAdmin
      .from('forums')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', forumId)

    if (updateError) {
      console.error('续费论坛失败:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // 扣除沙币
    const { error: coinsError } = await supabaseAdmin
      .from('users')
      .update({ sand_coins: user.sand_coins - RENEW_FORUM_COST })
      .eq('id', authUser.id)

    if (coinsError) {
      console.error('扣除沙币失败:', coinsError)
      return NextResponse.json({ success: false, error: '扣除沙币失败' }, { status: 500 })
    }

    // 记录操作
    await supabaseAdmin.from('forum_operations').insert({
      forum_id: forumId,
      user_id: authUser.id,
      operation_type: 'renew',
      coins_spent: RENEW_FORUM_COST
    })

    return NextResponse.json({ 
      success: true,
      newExpiry: newExpiry.toISOString()
    })
  } catch (error: any) {
    console.error('续费论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '续费失败' }, { status: 500 })
  }
}

