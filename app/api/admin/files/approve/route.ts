import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export async function POST(request: NextRequest) {
  try {
    // 检查认�?    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访�? },
        { status: 401 }
      )
    }

    const token = auth.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 401 }
      )
    }

    // 检查用户是否为管理�?    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('is_admin, is_moderator')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_admin && !userProfile?.is_moderator) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    const { fileId, approved } = await request.json()

    if (!fileId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log('文件审核API调用:', { fileId, approved, userId: user.id })

    if (approved) {
      // 审核通过：更新文件状�?      const { data: updateResult, error } = await supabaseAdmin
        .from('files')
        .update({ is_approved: true })
        .eq('id', fileId)
        .select()

      if (error) {
        console.error('数据库更新失�?', error)
        return NextResponse.json(
          { success: false, error: '数据库更新失�? },
          { status: 500 }
        )
      }

      console.log('文件审核通过:', updateResult)
      return NextResponse.json({
        success: true,
        message: '文件审核通过',
        data: updateResult?.[0]
      })
    } else {
      // 审核拒绝：直接删除文�?      const { error: deleteError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', fileId)

      if (deleteError) {
        console.error('文件删除失败:', deleteError)
        return NextResponse.json(
          { success: false, error: '文件删除失败' },
          { status: 500 }
        )
      }

      console.log('文件审核拒绝，已删除文件:', fileId)
      return NextResponse.json({
        success: true,
        message: '文件审核拒绝，已删除',
        deleted: true
      })
    }

  } catch (error) {
    console.error('文件审核API错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错�? },
      { status: 500 }
    )
  }
}
