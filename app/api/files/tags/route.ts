import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

/** 获取所有标签，并清理无文件的标签 */
export async function GET() {
  try {
    const supabase = await getSupabaseAdmin()

    // 先删除没有任何文件的标签
    const { data: allTags } = await supabase.from('file_tags').select('id')
    if (allTags?.length) {
      for (const tag of allTags) {
        const { count } = await supabase
          .from('file_tag_links')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id)
        if (count === 0) {
          await supabase.from('file_tags').delete().eq('id', tag.id)
        }
      }
    }

    const { data: tags, error } = await supabase
      .from('file_tags')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('获取标签失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: tags || [] })
  } catch (e: any) {
    console.error('Tags API error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
