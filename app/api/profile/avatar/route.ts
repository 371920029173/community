import { NextRequest, NextResponse } from 'next/server'

import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 用户提交头像更换申请
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未认�? }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const { new_avatar_url } = await request.json()
    if (!new_avatar_url) return NextResponse.json({ success: false, error: '缺少头像地址' }, { status: 400 })

    // 使用服务端凭据写入，绕过 RLS（仍然校验身份）
    const { data, error } = await supabaseAdmin.from('avatar_change_requests').insert({
      user_id: user.id,
      new_avatar_url,
      status: 'pending'
    }).select('*').single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('头像申请失败:', e)
    return NextResponse.json({ success: false, error: e.message || '提交失败' }, { status: 500 })
  }
}

// 审核�?管理员审�?export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未认�? }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const { id, approve, reason } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: '缺少请求ID' }, { status: 400 })

    const status = approve ? 'approved' : 'rejected'
    const { data: updated, error } = await supabaseAdmin.from('avatar_change_requests')
      .update({ status, reviewer_id: user.id, reason, reviewed_at: new Date().toISOString() })
      .eq('id', id).select('*').single()

    if (error) throw error

    if (status === 'approved') {
      await supabaseAdmin.from('users').update({ avatar_url: updated.new_avatar_url }).eq('id', updated.user_id)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('头像审批失败:', e)
    return NextResponse.json({ success: false, error: e.message || '审批失败' }, { status: 500 })
  }
}


