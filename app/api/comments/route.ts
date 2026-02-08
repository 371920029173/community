import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const { fileId, content, parentId } = await request.json()

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

    // 插入评论（支持回复：parentId 不为空时为回复）
    const insertData: Record<string, unknown> = {
      file_id: fileId,
      user_id: authUser.id,
      username: username,
      content: content.trim()
    }
    if (parentId) insertData.parent_id = parentId

    const { data: comment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert(insertData)
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

    // 构建层级：顶级评论与回复
    const topLevel = (comments || []).filter((c: { parent_id?: string }) => !c.parent_id)
    const replyMap = (comments || []).reduce((acc: Record<string, unknown[]>, c: { parent_id?: string }) => {
      if (c.parent_id) {
        acc[c.parent_id] = acc[c.parent_id] || []
        acc[c.parent_id].push(c)
      }
      return acc
    }, {})

    if (error) {
      console.error('获取评论失败:', error)
      return NextResponse.json(
        { success: false, error: `获取评论失败: ${error.message}` },
        { status: 500 }
      )
    }

    // 为每条评论获取用户头像信息
    const allComments = comments || []
    const commentsWithAvatars = await Promise.all(
      allComments.map(async (comment: { user_id: string; [k: string]: unknown }) => {
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

    // 构建带头像的层级结构
    const avatarMap = Object.fromEntries(commentsWithAvatars.map((c: { id: string; [k: string]: unknown }) => [c.id, c]))
    const topWithAvatars = topLevel.map((c: { id: string }) => avatarMap[c.id]).filter(Boolean)
    const replyMapWithAvatars: Record<string, unknown[]> = {}
    for (const [pid, replies] of Object.entries(replyMap)) {
      replyMapWithAvatars[pid] = (replies as { id: string }[]).map((r: { id: string }) => avatarMap[r.id]).filter(Boolean)
    }

    const commentsTree = topWithAvatars.map((c: { id: string; [k: string]: unknown }) => ({
      ...c,
      replies: replyMapWithAvatars[c.id] || []
    }))

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
      data: commentsTree
    })

  } catch (error: any) {
    console.error('获取评论错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取评论失败' },
      { status: 500 }
    )
  }
}

