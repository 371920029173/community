import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 超级管理员给用户沙币
export async function POST(request: NextRequest) {
  try {
    const { userId, coins } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    if (!userId || !coins || coins <= 0) {
      return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 检查是否是超级管理员
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', authUser.id)
      .single()

    if (!adminUser || adminUser.username !== '371920029173') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取目标用户当前沙币
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('sand_coins, username')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    // 更新沙币
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ sand_coins: (targetUser.sand_coins || 0) + coins })
      .eq('id', userId)

    if (updateError) {
      console.error('更新沙币失败:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `已给用户 ${targetUser.username} 增加 ${coins} 个沙币`,
      newBalance: (targetUser.sand_coins || 0) + coins
    })
  } catch (error: any) {
    console.error('给沙币API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '操作失败' }, { status: 500 })
  }
}

