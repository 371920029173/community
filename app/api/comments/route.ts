import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const { fileId, content } = await request.json()

    if (!fileId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取用户认证信息
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权，请先登录' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      )
    }

    // 创建客户端来验证用户
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // 获取当前用户
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: '用户认证失败，请重新登录' },
        { status: 401 }
      )
    }

    // 获取用户信息（username, nickname）
    const supabaseAdmin = await getSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('username, nickname')
      .eq('id', authUser.id)
      .single()

    const username = userData?.nickname || userData?.username || '未知用户'

    // 插入评论
    const { data: comment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert({
        file_id: fileId,
        user_id: authUser.id,
        username: username,
        content: content.trim()
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('创建评论失败:', insertError)
      return NextResponse.json(
        { success: false, error: `创建评论失败: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 更新文件的评论计数（如果存在 comments_count 字段）
    try {
      await supabaseAdmin.rpc('increment_comments_count', { file_id: fileId })
    } catch (e) {
      // 如果 RPC 不存在或失败，忽略错误（向后兼容）
      console.warn('更新评论计数失败:', e)
    }

    return NextResponse.json({
      success: true,
      data: comment,
      message: '评论发布成功'
    })

  } catch (error: any) {
    console.error('评论创建错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '评论创建失败' },
      { status: 500 }
    )
  }
}

// 获取评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: '缺少文件ID' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await getSupabaseAdmin()

    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取评论失败:', error)
      return NextResponse.json(
        { success: false, error: `获取评论失败: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comments || []
    })

  } catch (error: any) {
    console.error('获取评论错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取评论失败' },
      { status: 500 }
    )
  }
}

