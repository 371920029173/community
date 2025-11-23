import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function POST(
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
      .select('owner_id, is_hidden')
      .eq('id', forumId)
      .single()

    if (forumError || !forum) {
      return NextResponse.json({ success: false, error: '论坛不存在' }, { status: 404 })
    }

    if (forum.owner_id !== authUser.id) {
      return NextResponse.json({ success: false, error: '您不是论坛所有者' }, { status: 403 })
    }

    // 切换隐藏状态
    const { error: updateError } = await supabaseAdmin
      .from('forums')
      .update({ is_hidden: !forum.is_hidden })
      .eq('id', forumId)

    if (updateError) {
      console.error('隐藏/显示论坛失败:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // 记录操作
    await supabaseAdmin.from('forum_operations').insert({
      forum_id: forumId,
      user_id: authUser.id,
      operation_type: forum.is_hidden ? 'unhide' : 'hide',
      coins_spent: 0
    })

    return NextResponse.json({ 
      success: true,
      is_hidden: !forum.is_hidden
    })
  } catch (error: any) {
    console.error('隐藏/显示论坛API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '操作失败' }, { status: 500 })
  }
}

