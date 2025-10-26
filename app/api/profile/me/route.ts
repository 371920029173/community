import { NextRequest, NextResponse } from 'next/server'
import { createEdgeSupabaseClient, edgeQuery } from '@/lib/supabaseEdgeRuntime'

export const runtime = 'edge'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 使用 Edge Runtime 兼容的 Supabase 客户端
    const supabase = createEdgeSupabaseClient()

    const { data, error } = await edgeQuery(() =>
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
    )

    if (error) {
      console.error('Supabase 查询错误:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 使用 Edge Runtime 兼容的 Supabase 客户端
    const supabase = createEdgeSupabaseClient()

    const { data, error } = await edgeQuery(() =>
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
    )

    if (error) {
      console.error('Supabase 查询错误:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}






