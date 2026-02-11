import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }
    const token = auth.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') || null

    const [filesRes, foldersRes, folderInfoRes] = await Promise.all([
      supabaseAdmin.from('drive_files').select('*').eq('user_id', user.id).is('folder_id', folderId).order('created_at', { ascending: false }),
      supabaseAdmin.from('drive_folders').select('*').eq('user_id', user.id).is('parent_id', folderId).order('name', { ascending: true }),
      folderId ? supabaseAdmin.from('drive_folders').select('id, name').eq('id', folderId).single() : Promise.resolve({ data: null })
    ])

    const files = filesRes.data || []
    const folders = foldersRes.data || []
    const currentFolder = folderInfoRes.data

    return NextResponse.json({ success: true, files, folders, currentFolder })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '获取失败' }, { status: 500 })
  }
}