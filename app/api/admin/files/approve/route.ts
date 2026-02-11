import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // 检查认证
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
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

    // 检查用户是否为管理员
    const { data: userProfile } = await supabaseAdmin
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
      const { data: fileRow } = await supabaseAdmin.from('files').select('folder_id').eq('id', fileId).single()
      if (fileRow?.folder_id) {
        let fid: string | null = fileRow.folder_id
        while (fid) {
          await supabaseAdmin.from('share_folders').update({ is_approved: true }).eq('id', fid)
          const { data: parent } = await supabaseAdmin.from('share_folders').select('parent_id').eq('id', fid).single()
          fid = parent?.parent_id || null
        }
      }
      const { data: updateResult, error } = await supabaseAdmin
        .from('files')
        .update({ is_approved: true })
        .eq('id', fileId)
        .select()

      if (error) {
        console.error('数据库更新失败:', error)
        return NextResponse.json(
          { success: false, error: '数据库更新失败' },
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
      // 审核拒绝：直接删除文件
      const { error: deleteError } = await supabaseAdmin
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
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
