import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// 幂等创建/补建用户资料（强唯一策略）：
// - 若 id 已存在：更新基础字段返回
// - 若 username/email 与其他用户冲突：直接 409，不自动加后缀
export async function POST(request: NextRequest) {
  try {
    const { userId, username, email, isInitialAdmin, deviceFingerprint, inviteCode } = await request.json()

    if (!userId || !username || !email) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()

    // 先看是否已存在同 id 的资料，存在则更新并返回
    const existingById = await supabaseAdmin.from('users').select('*').eq('id', userId).single()
    if (existingById.data) {
      const updateRes = await supabaseAdmin
        .from('users')
        .update({
          username,
          email,
          nickname: username,
          nickname_color: '#3B82F6',
          is_admin: !!isInitialAdmin,
          is_moderator: !!isInitialAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single()
      if (updateRes.error) {
        return NextResponse.json({ success: false, error: updateRes.error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, data: updateRes.data })
    }

    // 检查用户名/邮箱是否被其他用户占用
    const dupCheck = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .neq('id', userId)
      .limit(1)

    if (dupCheck.data && dupCheck.data.length > 0) {
      return NextResponse.json({ success: false, error: '用户名或邮箱已存在' }, { status: 409 })
    }

    let invitedBy: string | null = null
    if (inviteCode && typeof inviteCode === 'string') {
      const { data: inviter } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .neq('id', userId)
        .maybeSingle()
      if (inviter) invitedBy = inviter.id
    }

    const genInviteCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let c = ''
      for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)]
      return c
    }

    let insertData: any = {
      id: userId,
      username,
      email,
      nickname: username,
      nickname_color: '#3B82F6',
      is_admin: !!isInitialAdmin,
      is_moderator: !!isInitialAdmin,
      storage_used: 0,
      storage_limit: isInitialAdmin ? 107374182400 : 21474836480,
      ...(invitedBy ? { invited_by: invitedBy } : {})
    }
    
    if (deviceFingerprint) {
      insertData.device_fingerprint = deviceFingerprint
    }
    
    let insertRes: any = null
    for (let retry = 0; retry < 5; retry++) {
      insertData = { ...insertData, invite_code: genInviteCode() }
      insertRes = await supabaseAdmin.from('users').insert(insertData).select('*').single()
      if (!insertRes.error) break
      if (insertRes.error.code === '23505' && insertRes.error.message?.includes('invite_code')) continue
      break
    }
    if (!insertRes) {
      return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 })
    }
    if (insertRes.error) {
      const err = insertRes.error
      if (err.code === '23505') {
        return NextResponse.json({ success: false, error: '用户名或邮箱已存在' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: insertRes.data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '创建资料失败' }, { status: 500 })
  }
}







