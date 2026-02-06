import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { tryGrantInviteReward } from '@/lib/inviteReward'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// 创建论坛需要30个沙币
const CREATE_FORUM_COST = 30
// 论坛保质期60天
const FORUM_EXPIRY_DAYS = 60
// 用户最多创建10个论坛
const MAX_FORUMS_PER_USER = 10

export async function POST(request: NextRequest) {
  try {
    const { title, description, current_topic } = await request.json()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()

    // 验证用户身份
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
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

    if (user.sand_coins < CREATE_FORUM_COST) {
      return NextResponse.json({ 
        success: false, 
        error: `沙币不足，创建论坛需要${CREATE_FORUM_COST}个沙币` 
      }, { status: 400 })
    }

    // 检查用户已创建的论坛数量
    const { data: existingForums, error: countError } = await supabaseAdmin
      .from('forums')
      .select('id')
      .eq('owner_id', authUser.id)

    if (countError) {
      return NextResponse.json({ success: false, error: '检查论坛数量失败' }, { status: 500 })
    }

    if ((existingForums?.length || 0) >= MAX_FORUMS_PER_USER) {
      return NextResponse.json({ 
        success: false, 
        error: `您最多只能创建${MAX_FORUMS_PER_USER}个论坛` 
      }, { status: 400 })
    }

    // 计算过期时间
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + FORUM_EXPIRY_DAYS)

    // 创建论坛
    const { data: forum, error: forumError } = await supabaseAdmin
      .from('forums')
      .insert({
        owner_id: authUser.id,
        title: title.trim(),
        description: description?.trim() || null,
        current_topic: current_topic?.trim() || null,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (forumError) {
      console.error('创建论坛失败:', forumError)
      return NextResponse.json({ success: false, error: forumError.message }, { status: 500 })
    }

    // 扣除沙币
    const { error: coinsError } = await supabaseAdmin
      .from('users')
      .update({ sand_coins: user.sand_coins - CREATE_FORUM_COST })
      .eq('id', authUser.id)

    if (coinsError) {
      console.error('扣除沙币失败:', coinsError)
      // 回滚：删除已创建的论坛
      await supabaseAdmin.from('forums').delete().eq('id', forum.id)
      return NextResponse.json({ success: false, error: '扣除沙币失败' }, { status: 500 })
    }

    // 记录操作
    await supabaseAdmin.from('forum_operations').insert({
      forum_id: forum.id,
      user_id: authUser.id,
      operation_type: 'create',
      coins_spent: CREATE_FORUM_COST
    })

    // 自动将创建者加入论坛成员
    await supabaseAdmin.from('forum_members').insert({
      forum_id: forum.id,
      user_id: authUser.id
    })

    try {
      await tryGrantInviteReward(supabaseAdmin, authUser.id)
    } catch (_) {}

    return NextResponse.json({ 
      success: true, 
      data: forum 
    })
  } catch (error: any) {
    console.error('创建论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '创建失败' }, { status: 500 })
  }
}

