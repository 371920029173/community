import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const body = await request.json()
    const fileIds: string[] = body?.fileIds || []
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ success: false, error: '没有要删除的文件' }, { status: 400 })
    }

    const { data: files, error } = await supabaseAdmin
      .from('drive_files')
      .select('id, file_path, user_id, file_size')
      .in('id', fileIds)

    if (error) throw error

    const ownFiles = (files || []).filter((f: any) => f.user_id === user.id)
    const paths = ownFiles.map((f: any) => f.file_path).filter(Boolean)
    
    // 1. 删除存储桶中的文件
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('drive').remove(paths)
      
      // 尝试删除可能的缓存文件
      const cachePaths: string[] = []
      paths.forEach((path: string) => {
        if (path) {
          const basePath = path.substring(0, path.lastIndexOf('.'))
          const ext = path.substring(path.lastIndexOf('.'))
          cachePaths.push(
            `${basePath}_thumb${ext}`,
            `${basePath}_cache${ext}`,
            `${basePath}_preview${ext}`,
            `${path}.cache`,
            `${path}.tmp`
          )
        }
      })
      // 批量删除缓存文件（静默失败）
      if (cachePaths.length > 0) {
        await Promise.allSettled(
          cachePaths.map(path => 
            supabaseAdmin.storage.from('drive').remove([path]).catch(() => {})
          )
        )
      }
    }
    
    // 2. 删除数据库记录
    await supabaseAdmin.from('drive_files').delete().in('id', ownFiles.map((f: any) => f.id))
    
    // 3. 更新用户存储使用量
    const totalDeletedSize = ownFiles.reduce((sum: number, f: any) => sum + (f.file_size || 0), 0)
    if (totalDeletedSize > 0) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('storage_used')
        .eq('id', user.id)
        .single()
      
      if (userData && typeof userData.storage_used === 'number') {
        const newStorageUsed = Math.max(0, userData.storage_used - totalDeletedSize)
        await supabaseAdmin
          .from('users')
          .update({ storage_used: newStorageUsed })
          .eq('id', user.id)
      }
    }

    return NextResponse.json({ success: true, deleted: ownFiles.map((f: any) => f.id) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '删除失败' }, { status: 500 })
  }
}



