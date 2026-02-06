import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function GET(request: NextRequest) {
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

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('invite_code')
      .eq('id', authUser.id)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ success: false, error: '获取用户失败' }, { status: 500 })
    }

    let code = userRow.invite_code
    if (!code) {
      for (let retry = 0; retry < 5; retry++) {
        code = generateInviteCode()
        const { error: upErr } = await supabaseAdmin
          .from('users')
          .update({ invite_code: code })
          .eq('id', authUser.id)
        if (!upErr) break
        if (upErr.code === '23505') continue
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
      }
      if (!code) return NextResponse.json({ success: false, error: '生成邀请码失败' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (request.nextUrl?.origin || '')
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/register?ref=${code}`

    return NextResponse.json({
      success: true,
      data: { inviteCode: code, inviteUrl }
    })
  } catch (error: any) {
    console.error('邀请码API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '请求失败' }, { status: 500 })
  }
}
