import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 删除文件
export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const resolvedParams = await context.params
    const fileId = resolvedParams.id
    
    // 从请求头获取用户ID
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 检查文件是否存在且属于该用户 - 使用管理员权限绕过RLS
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    console.log('删除文件检查:', {
      fileId,
      userId: user.id,
      file,
      fileError
    })

    if (fileError || !file) {
      console.log('文件检查失败:', fileError)
      return NextResponse.json(
        { success: false, error: '文件不存在或无权限删除' },
        { status: 404 }
      )
    }

    // 从存储桶中删除文件
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([file.file_path])

    if (storageError) {
      console.error('存储桶删除失败:', storageError)
      // 继续删除数据库记录，即使存储桶删除失败
    }

    // 删除数据库记录 - 使用管理员权限绕过RLS
    const { error: deleteError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', fileId)

    console.log('数据库删除结果:', {
      fileId,
      deleteError
    })

    if (deleteError) {
      console.log('数据库删除失败:', deleteError)
      throw deleteError
    }

    // 更新用户存储使用量 - 使用管理员权限绕过RLS
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('storage_used')
      .eq('id', file.user_id)
      .single()

    if (userData) {
      const newStorageUsed = Math.max(0, userData.storage_used - file.file_size)
      await supabaseAdmin
        .from('users')
        .update({ storage_used: newStorageUsed })
        .eq('id', file.user_id)
    }

    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    })

  } catch (error: any) {
    console.error('删除文件失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '删除失败' },
      { status: 500 }
    )
  }
}

// 更新文件信息（重命名等）
export async function PATCH(
  request: NextRequest,
  context: any
) {
  try {
    const resolvedParams = await context.params
    const fileId = resolvedParams.id
    const body = await request.json()
    
    // 从请求头获取用户ID
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 检查文件是否存在且属于该用户
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { success: false, error: '文件不存在或无权限修改' },
        { status: 404 }
      )
    }

    // 更新文件信息
    const updateData: any = {}
    if (body.original_name) updateData.original_name = body.original_name
    if (body.is_public !== undefined) updateData.is_public = body.is_public
    if (body.description !== undefined) updateData.description = body.description

    const { error: updateError } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', fileId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: '文件更新成功'
    })

  } catch (error: any) {
    console.error('更新文件失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    )
  }
}

// 下载文件
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const resolvedParams = await context.params
    const fileId = resolvedParams.id
    
    // 从请求头获取用户ID
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 检查文件是否存在
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      )
    }

    // 检查权限：只能下载自己的文件或公开文件
    if (file.user_id !== user.id && !file.is_public) {
      return NextResponse.json(
        { success: false, error: '无权限下载此文件' },
        { status: 403 }
      )
    }

    // 更新下载次数
    await supabase
      .from('files')
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq('id', fileId)

    // 重定向到美化的文件查看页面
    return NextResponse.redirect(new URL(`/view/${fileId}`, request.url))

  } catch (error: any) {
    console.error('下载文件失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '下载失败' },
      { status: 500 }
    )
  }
} 