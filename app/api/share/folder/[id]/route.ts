import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 获取分享文件夹内容（公开已审核，或私聊文件夹且用户有权限）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const folderId = resolvedParams.id
    if (!folderId) {
      return NextResponse.json({ success: false, error: '缺少文件夹ID' }, { status: 400 })
    }

    let folder: { id: string; name: string; user_id: string; is_public: boolean; is_approved: boolean } | null = null
    const { data: folderRow, error: folderErr } = await supabaseAdmin
      .from('share_folders')
      .select('id, name, user_id, is_public, is_approved')
      .eq('id', folderId)
      .single()

    if (folderErr || !folderRow) {
      return NextResponse.json({ success: false, error: '文件夹不存在' }, { status: 404 })
    }

    const auth = request.headers.get('authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id || null
    }

    if (folderRow.is_public && folderRow.is_approved) {
      folder = folderRow
    } else if (userId) {
      if (folderRow.user_id === userId) folder = folderRow
      else {
        const { data: msg } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('folder_id', folderId)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .limit(1)
          .maybeSingle()
        if (msg) folder = folderRow
      }
    }

    if (!folder) {
      return NextResponse.json({ success: false, error: '文件夹不存在或无权访问' }, { status: 404 })
    }

    const isPublicFolder = folder.is_public && folder.is_approved
    let filesQuery = supabaseAdmin.from('files').select('id, original_name, file_path, file_size, mime_type, created_at').eq('folder_id', folderId)
    if (isPublicFolder) filesQuery = filesQuery.eq('is_public', true).eq('is_approved', true)
    let foldersQuery = supabaseAdmin.from('share_folders').select('id, name, created_at').eq('parent_id', folderId)
    if (isPublicFolder) foldersQuery = foldersQuery.eq('is_public', true).eq('is_approved', true)

    const [filesRes, subfoldersRes] = await Promise.all([
      filesQuery.order('created_at', { ascending: false }),
      foldersQuery.order('name', { ascending: true })
    ])

    const files = filesRes.data || []
    const subfolders = subfoldersRes.data || []

    return NextResponse.json({
      success: true,
      currentFolder: folder,
      files,
      subfolders
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '获取失败' }, { status: 500 })
  }
}
