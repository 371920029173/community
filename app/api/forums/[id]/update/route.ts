import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 修改论坛内容需要3个沙币
const UPDATE_FORUM_COST = 3

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { current_topic, announcement } = await request.json()
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
      .select('owner_id')
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

    if (user.sand_coins < UPDATE_FORUM_COST) {
      return NextResponse.json({ 
        success: false, 
        error: `沙币不足，修改论坛需要${UPDATE_FORUM_COST}个沙币` 
      }, { status: 400 })
    }

    // 更新论坛内容
    const updateData: any = {}
    if (current_topic !== undefined) updateData.current_topic = current_topic?.trim() || null
    if (announcement !== undefined) updateData.announcement = announcement?.trim() || null

    const { error: updateError } = await supabaseAdmin
      .from('forums')
      .update(updateData)
      .eq('id', forumId)

    if (updateError) {
      console.error('更新论坛失败:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // 扣除沙币
    const { error: coinsError } = await supabaseAdmin
      .from('users')
      .update({ sand_coins: user.sand_coins - UPDATE_FORUM_COST })
      .eq('id', authUser.id)

    if (coinsError) {
      console.error('扣除沙币失败:', coinsError)
      return NextResponse.json({ success: false, error: '扣除沙币失败' }, { status: 500 })
    }

    // 记录操作
    await supabaseAdmin.from('forum_operations').insert({
      forum_id: forumId,
      user_id: authUser.id,
      operation_type: 'update',
      coins_spent: UPDATE_FORUM_COST
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('更新论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '更新失败' }, { status: 500 })
  }
}

