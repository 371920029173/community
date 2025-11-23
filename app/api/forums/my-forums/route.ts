import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 获取用户创建的所有论坛
    const { data: forums, error: forumsError } = await supabaseAdmin
      .from('forums')
      .select('id, title, expires_at, is_hidden, created_at')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: false })

    if (forumsError) {
      console.error('获取论坛失败:', forumsError)
      return NextResponse.json({ success: false, error: forumsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: forums || []
    })
  } catch (error: any) {
    console.error('获取我的论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

