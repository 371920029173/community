import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'


export async function DELETE(request: NextRequest) {
  try {
    const { fileIds } = await request.json()
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的文件ID列表' },
        { status: 400 }
      )
    }

    // 从请求头获取用户ID
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访�? },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信�?    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令�? },
        { status: 401 }
      )
    }

    // 获取用户要删除的文件
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .in('id', fileIds)

    if (filesError) throw filesError

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有找到要删除的文件' },
        { status: 404 }
      )
    }

    // 从存储桶中删除文�?    const filePaths = files.map(f => f.file_path).filter(Boolean)
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove(filePaths)

      if (storageError) {
        console.error('存储桶删除失�?', storageError)
        // 继续删除数据库记录，即使存储桶删除失�?      }
    }

    // 删除数据库记�?    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('user_id', user.id)
      .in('id', fileIds)

    if (deleteError) throw deleteError

    // 更新用户存储使用�?    const totalDeletedSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
    if (totalDeletedSize > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('storage_used')
        .eq('id', user.id)
        .single()

      if (userData) {
        const newStorageUsed = Math.max(0, userData.storage_used - totalDeletedSize)
        await supabase
          .from('users')
          .update({ storage_used: newStorageUsed })
          .eq('id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${files.length} 个文件`
    })

  } catch (error: any) {
    console.error('批量删除文件失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '批量删除失败' },
      { status: 500 }
    )
  }
} 
