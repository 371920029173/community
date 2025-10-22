import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: false, error: '未授权访�? }, { status: 401 })
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
      .select('id, file_path, user_id')
      .in('id', fileIds)

    if (error) throw error

    const ownFiles = (files || []).filter((f: any) => f.user_id === user.id)
    const paths = ownFiles.map((f: any) => f.file_path)
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('drive').remove(paths)
    }
    await supabaseAdmin.from('drive_files').delete().in('id', ownFiles.map((f: any) => f.id))

    return NextResponse.json({ success: true, deleted: ownFiles.map((f: any) => f.id) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '删除失败' }, { status: 500 })
  }
}



