import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const { query, fileType, tagId } = await request.json()

    const hasFilter = tagId || (fileType && fileType !== 'all')
    if ((!query || query.trim().length === 0) && !hasFilter) {
      return NextResponse.json(
        { success: false, error: '请输入搜索关键词或选择类别/类型过滤' },
        { status: 400 }
      )
    }

    const sb = await getSupabaseAdmin()

    // 若指定类别，先获取该类别的文件ID
    let fileIdsByTag: string[] | null = null
    if (tagId) {
      const { data: links } = await sb
        .from('file_tag_links')
        .select('file_id')
        .eq('tag_id', tagId)
      fileIdsByTag = (links || []).map((r: { file_id: string }) => r.file_id)
      if (fileIdsByTag.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
    }

    let searchQuery = sb
      .from('files')
      .select('*')
      .eq('is_public', true)
      .eq('is_approved', true)

    if (query && query.trim()) {
      searchQuery = searchQuery.or(
        `original_name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,author_name.ilike.%${query.trim()}%`
      )
    }

    if (fileIdsByTag) {
      searchQuery = searchQuery.in('id', fileIdsByTag)
    }

    if (fileType && fileType !== 'all') {
      searchQuery = searchQuery.eq('file_type', fileType)
    }

    searchQuery = searchQuery.order('created_at', { ascending: false }).limit(50)

    const { data: files, error } = await searchQuery

    if (error) {
      console.error('搜索文件失败:', error)
      return NextResponse.json(
        { success: false, error: '搜索失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: files || []
    })

  } catch (error: any) {
    console.error('搜索API错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '搜索失败' },
      { status: 500 }
    )
  }
}

