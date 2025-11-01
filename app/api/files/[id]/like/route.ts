import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 点赞/取消点赞文件
export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const resolvedParams = await context.params
    const fileId = resolvedParams.id

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

    const supabaseAdmin = await getSupabaseAdmin()

    // 检查文件是否存在
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('id, likes_count, user_id')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      )
    }

    // 检查是否已经点赞（如果有点赞表的话，这里简化为直接更新计数）
    // 这里简化处理：直接增加/减少点赞数
    // 实际应用中应该有一个 file_likes 表来记录用户点赞状态

    // 更新点赞数（简单实现：每次点击增加1）
    const newLikesCount = (file.likes_count || 0) + 1

    const { data: updatedFile, error: updateError } = await supabaseAdmin
      .from('files')
      .update({ likes_count: newLikesCount })
      .eq('id', fileId)
      .select('likes_count')
      .single()

    if (updateError) {
      console.error('更新点赞数失败:', updateError)
      return NextResponse.json(
        { success: false, error: `更新点赞数失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        likes_count: updatedFile.likes_count || 0
      },
      message: '点赞成功'
    })

  } catch (error: any) {
    console.error('点赞文件错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '点赞失败' },
      { status: 500 }
    )
  }
}

