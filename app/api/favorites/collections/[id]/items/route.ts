import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(
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

    const { fileId } = await request.json()
    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少 fileId' }, { status: 400 })
    }

    const { data: coll } = await sb.from('favorite_collections').select('id').eq('id', id).eq('user_id', user.id).single()
    if (!coll) {
      return NextResponse.json({ success: false, error: '收藏夹不存在' }, { status: 404 })
    }

    const { error } = await sb
      .from('favorite_items')
      .insert({ collection_id: id, file_id: fileId, user_id: user.id })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
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
    const fileId = request.nextUrl.searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少 fileId' }, { status: 400 })
    }
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
      .from('favorite_items')
      .delete()
      .eq('collection_id', id)
      .eq('file_id', fileId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
