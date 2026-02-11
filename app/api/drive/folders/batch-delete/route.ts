import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 递归收集文件夹及其所有子文件夹 ID
async function collectFolderIds(folderId: string, userId: string): Promise<string[]> {
  const { data: children } = await supabaseAdmin
    .from('drive_folders')
    .select('id')
    .eq('parent_id', folderId)
    .eq('user_id', userId)
  const ids = [folderId]
  for (const c of children || []) {
    const sub = await collectFolderIds(c.id, userId)
    ids.push(...sub)
  }
  return ids
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    const token = auth.slice(7)
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const folderIds: string[] = body?.folderIds || []
    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return NextResponse.json({ success: false, error: '没有要删除的文件夹' }, { status: 400 })
    }

    const allFolderIds = new Set<string>()
    for (const fid of folderIds) {
      const { data: folder } = await supabaseAdmin.from('drive_folders').select('id').eq('id', fid).eq('user_id', user.id).single()
      if (folder) {
        const tree = await collectFolderIds(fid, user.id)
        tree.forEach(id => allFolderIds.add(id))
      }
    }
    const ids = Array.from(allFolderIds)

    const { data: files } = await supabaseAdmin
      .from('drive_files')
      .select('id, file_path, user_id, file_size')
      .in('folder_id', ids)

    const ownFiles = (files || []).filter((f: any) => f.user_id === user.id)
    const paths = ownFiles.map((f: any) => f.file_path).filter(Boolean)
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('drive').remove(paths)
      await supabaseAdmin.from('drive_files').delete().in('id', ownFiles.map((f: any) => f.id))
      const totalSize = ownFiles.reduce((s: number, f: any) => s + (f.file_size || 0), 0)
      if (totalSize > 0) {
        const { data: ud } = await supabaseAdmin.from('users').select('storage_used').eq('id', user.id).single()
        if (ud?.storage_used != null) {
          await supabaseAdmin.from('users').update({ storage_used: Math.max(0, ud.storage_used - totalSize) }).eq('id', user.id)
        }
      }
    }

    await supabaseAdmin.from('drive_folders').delete().in('id', ids)
    return NextResponse.json({ success: true, deleted: ids })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '删除失败' }, { status: 500 })
  }
}
