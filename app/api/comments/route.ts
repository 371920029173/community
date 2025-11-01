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

    // 获取用户信息（username, nickname, avatar_url）
    const supabaseAdmin = await getSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('username, nickname, avatar_url')
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

    // 添加用户头像信息到返回的评论对象
    if (comment && userData) {
      comment.avatar_url = userData.avatar_url || null
    }

    if (insertError) {
      console.error('创建评论失败:', insertError)
      return NextResponse.json(
        { success: false, error: `创建评论失败: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 更新文件的评论计数
    try {
      // 先获取文件的当前评论数
      const { data: currentFile } = await supabaseAdmin
        .from('files')
        .select('comments_count')
        .eq('id', fileId)
        .single()

      const currentCount = currentFile?.comments_count ?? 0
      const newCount = currentCount + 1

      // 更新文件的 comments_count 字段
      await supabaseAdmin
        .from('files')
        .update({ comments_count: newCount })
        .eq('id', fileId)
    } catch (e) {
      // 如果字段不存在或更新失败，记录警告但不影响评论创建
      console.warn('更新评论计数失败（可能字段不存在）:', e)
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

    // 为每条评论获取用户头像信息
    const commentsWithAvatars = await Promise.all(
      (comments || []).map(async (comment) => {
        try {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('avatar_url')
            .eq('id', comment.user_id)
            .single()

          return {
            ...comment,
            avatar_url: userData?.avatar_url || null
          }
        } catch (err) {
          return {
            ...comment,
            avatar_url: null
          }
        }
      })
    )

    // 同步评论数到文件记录（确保数据一致性）
    try {
      const actualCommentCount = commentsWithAvatars.length
      await supabaseAdmin
        .from('files')
        .update({ comments_count: actualCommentCount })
        .eq('id', fileId)
    } catch (e) {
      // 如果字段不存在，忽略错误
      console.warn('同步评论数失败:', e)
    }

    return NextResponse.json({
      success: true,
      data: commentsWithAvatars
    })

  } catch (error: any) {
    console.error('获取评论错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取评论失败' },
      { status: 500 }
    )
  }
}

