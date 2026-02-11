import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 创建分享文件夹
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId, isPublic = true } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: '文件夹名称不能为空' }, { status: 400 })
    }

    // 公开分享需审核，私聊文件夹直接通过
    const isPub = isPublic === true
    const { data: folder, error } = await supabaseAdmin
      .from('share_folders')
      .insert({
        name: name.trim(),
        parent_id: parentId || null,
        user_id: user.id,
        is_public: isPub,
        is_approved: isPub ? false : true
      })
      .select()
      .single()

    if (error) {
      console.error('Create share folder error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, folder })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '创建失败' }, { status: 500 })
  }
}
