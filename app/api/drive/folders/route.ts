import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }
    const token = auth.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const name = (body.name as string)?.trim()
    const parentId = body.parentId || null

    if (!name) {
      return NextResponse.json({ success: false, error: '文件夹名称不能为空' }, { status: 400 })
    }

    const { data, error: insErr } = await supabaseAdmin
      .from('drive_folders')
      .insert({
        name,
        parent_id: parentId,
        user_id: user.id
      })
      .select()
      .single()

    if (insErr) throw insErr
    return NextResponse.json({ success: true, folder: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '创建失败' }, { status: 500 })
  }
}
