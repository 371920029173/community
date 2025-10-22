import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { query, fileType } = await request.json()

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '搜索关键词不能为空' },
        { status: 400 }
      )
    }

    // 构建搜索查询
    let searchQuery = supabase
      .from('files')
      .select('*')
      .eq('is_public', true) // 只搜索公开文件
      .or(`original_name.ilike.%${query}%,description.ilike.%${query}%,author_name.ilike.%${query}%`)

    // 如果指定了文件类型，添加类型过滤
    if (fileType && fileType !== 'all') {
      searchQuery = searchQuery.eq('file_type', fileType)
    }

    // 按创建时间倒序排列
    searchQuery = searchQuery.order('created_at', { ascending: false })

    // 限制结果数量
    searchQuery = searchQuery.limit(50)

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

