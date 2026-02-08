import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    const sb = await getSupabaseAdmin()
    const { data: { user }, error: authError } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })
    }

    const { data: coll } = await sb.from('favorite_collections').select('id, name').eq('id', id).eq('user_id', user.id).single()
    if (!coll) {
      return NextResponse.json({ success: false, error: '收藏夹不存在' }, { status: 404 })
    }

    const { data: items } = await sb
      .from('favorite_items')
      .select('id, file_id, created_at')
      .eq('collection_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const fileIds = (items || []).map((i: { file_id: string }) => i.file_id)
    if (fileIds.length === 0) {
      return NextResponse.json({ success: true, data: { collection: coll, files: [] } })
    }

    const { data: files } = await sb
      .from('files')
      .select('id, original_name, file_size, mime_type, created_at, author_name, description')
      .in('id', fileIds)
      .eq('is_public', true)
      .eq('is_approved', true)

    const fileMap = Object.fromEntries((files || []).map((f: { id: string }) => [f.id, f]))
    const orderedFiles = fileIds.map((fid: string) => fileMap[fid]).filter(Boolean)

    return NextResponse.json({ success: true, data: { collection: coll, files: orderedFiles } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    const sb = await getSupabaseAdmin()
    const { data: { user } } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })
    }

    const { error } = await sb
      .from('favorite_collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
