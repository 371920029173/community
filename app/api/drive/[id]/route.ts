import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 删除/重命名/获取签名链接
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const resolvedParams = await params
    const { data: file, error } = await supabaseAdmin.from('drive_files').select('*').eq('id', resolvedParams.id).single()
    if (error || !file) return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 })
    if (file.user_id !== user.id) return NextResponse.json({ success: false, error: '无权限' }, { status: 403 })

    // 1. 删除存储桶中的文件（包括可能的变体/缓存）
    await supabaseAdmin.storage.from('drive').remove([file.file_path])
    
    // 2. 尝试删除可能的缓存文件或缩略图（如果有）
    if (file.file_path) {
      const basePath = file.file_path.substring(0, file.file_path.lastIndexOf('.'))
      const ext = file.file_path.substring(file.file_path.lastIndexOf('.'))
      // 删除可能的缩略图或缓存版本
      const possibleCacheFiles = [
        `${basePath}_thumb${ext}`,
        `${basePath}_cache${ext}`,
        `${basePath}_preview${ext}`,
        `${file.file_path}.cache`,
        `${file.file_path}.tmp`
      ]
      // 批量删除可能的缓存文件（静默失败）
      await Promise.allSettled(
        possibleCacheFiles.map(path => 
          supabaseAdmin.storage.from('drive').remove([path]).catch(() => {})
        )
      )
    }
    
    // 3. 删除数据库记录
    await supabaseAdmin.from('drive_files').delete().eq('id', resolvedParams.id)
    
    // 4. 更新用户存储使用量
    if (file.file_size && typeof file.file_size === 'number') {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('storage_used')
        .eq('id', file.user_id)
        .single()
      
      if (userData && typeof userData.storage_used === 'number') {
        const newStorageUsed = Math.max(0, userData.storage_used - file.file_size)
        await supabaseAdmin
          .from('users')
          .update({ storage_used: newStorageUsed })
          .eq('id', file.user_id)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '删除失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const resolvedParams = await params
    const body = await request.json()
    const { data: file } = await supabaseAdmin.from('drive_files').select('user_id').eq('id', resolvedParams.id).single()
    if (!file || file.user_id !== user.id) return NextResponse.json({ success: false, error: '无权限' }, { status: 403 })

    await supabaseAdmin.from('drive_files').update({ original_name: body.original_name }).eq('id', resolvedParams.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '更新失败' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const resolvedParams = await params
    const { data: file, error } = await supabaseAdmin.from('drive_files').select('*').eq('id', resolvedParams.id).single()
    if (error || !file) return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 })
    if (file.user_id !== user.id) return NextResponse.json({ success: false, error: '无权限' }, { status: 403 })

    const { data: signed, error: sErr } = await supabaseAdmin.storage.from('drive').createSignedUrl(file.file_path, 60)
    if (sErr) return NextResponse.json({ success: false, error: '链接生成失败' }, { status: 500 })
    return NextResponse.json({ success: true, url: signed.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '获取失败' }, { status: 500 })
  }
}