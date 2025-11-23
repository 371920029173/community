import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // 删除论坛（级联删除会自动删除相关数据）
    const { error: deleteError } = await supabaseAdmin
      .from('forums')
      .delete()
      .eq('id', forumId)

    if (deleteError) {
      console.error('删除论坛失败:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    // 记录操作
    await supabaseAdmin.from('forum_operations').insert({
      forum_id: forumId,
      user_id: authUser.id,
      operation_type: 'delete',
      coins_spent: 0
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '删除失败' }, { status: 500 })
  }
}

