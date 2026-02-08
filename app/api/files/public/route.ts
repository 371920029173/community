import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'all'
    const tagId = searchParams.get('tagId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // 构建查询条件
    // 使用管理端绕过RLS，保证可取到作者id等信息
    let query = supabaseAdmin
      .from('files')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    // 添加搜索条件
    if (search) {
      query = query.or(`original_name.ilike.%${search}%,description.ilike.%${search}%,author_name.ilike.%${search}%`)
    }

    // 添加类型筛选
    if (type && type !== 'all') {
      query = query.eq('file_type', type)
    }

    // 类别（标签）筛选
    if (tagId) {
      const { data: links } = await supabaseAdmin
        .from('file_tag_links')
        .select('file_id')
        .eq('tag_id', tagId)
      const ids = (links || []).map((r: { file_id: string }) => r.file_id)
      if (ids.length === 0) {
        return NextResponse.json({ success: true, files: [], pagination: { page, limit, total: 0, pages: 0 } })
      }
      query = query.in('id', ids)
    }

    // 添加分页
    query = query.range(offset, offset + limit - 1)

    const { data: files, error, count } = await query

    if (error) {
      console.error('Error fetching public files:', error)
      return NextResponse.json(
        { success: false, error: '获取文件列表失败' },
        { status: 500 }
      )
    }

    // 处理文件数据，确保字段存在并统一字段名
    const processedFiles = (files || []).map((file: any) => ({
      ...file,
      author_name: file.author_name || '未知用户',
      // 统一字段名：确保 download_count 存在（如果数据库返回 downloads_count，也映射过来）
      download_count: file.download_count ?? file.downloads_count ?? 0,
      likes_count: file.likes_count ?? 0,
      comments_count: file.comments_count ?? 0
    }))

    return NextResponse.json({
      success: true,
      files: processedFiles,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Public files API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    )
  }
} 