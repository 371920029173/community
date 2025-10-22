import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访�? }, { status: 401 })
    }
    const token = auth.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const { data, error: qErr } = await supabaseAdmin
      .from('drive_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (qErr) throw qErr
    return NextResponse.json({ success: true, files: data || [] })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '获取失败' }, { status: 500 })
  }
}
