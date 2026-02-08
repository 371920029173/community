import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { title, content, type, authorId, authorName, isActive, expiresAt } = await request.json()
    
    console.log('公告创建请求:', { title, content, type, authorId, authorName, isActive })

    if (!title || !content || !authorId) {
      console.log('缺少必要参数:', { title: !!title, content: !!content, authorId: !!authorId })
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证用户权限
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin, is_moderator')
      .eq('id', authorId)
      .single()

    console.log('用户权限查询结果:', { userData, userError })

    if (userError || !userData || (!userData.is_admin && !userData.is_moderator)) {
      console.log('权限验证失败:', { userError, userData })
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 创建公告 - 使用更通用的列名
    const { data: announcement, error: createError } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'info',
        user_id: authorId,  // 使用 user_id 而不是 author_id
        author_name: authorName || '系统',
        is_active: isActive !== false,
        expires_at: expiresAt || null
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { success: false, error: `创建公告失败: ${createError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '公告创建成功',
      data: announcement
    })

  } catch (error: any) {
    console.error('Create announcement error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')

    if (!authorId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      )
    }

    // 验证用户权限
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin, is_moderator')
      .eq('id', authorId)
      .single()

    if (userError || !userData || (!userData.is_admin && !userData.is_moderator)) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 获取公告列表
    const { data: announcements, error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: `获取公告列表失败: ${fetchError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        announcements: announcements || []
      }
    })

  } catch (error: any) {
    console.error('Get announcements error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }
    const sb = await getSupabaseAdmin()
    const { data: { user: authUser }, error: authError } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })
    }
    const { data: userRow } = await sb.from('users').select('is_admin, is_moderator').eq('id', authUser.id).single()
    if (!userRow?.is_admin && !userRow?.is_moderator) {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const { id, title, content, type, isActive, expiresAt } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少公告ID' },
        { status: 400 }
      )
    }

    // 更新公告
    const { data: announcement, error: updateError } = await sb
      .from('announcements')
      .update({
        title,
        content,
        type,
        is_active: isActive,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `更新公告失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '公告更新成功',
      data: announcement
    })

  } catch (error: any) {
    console.error('Update announcement error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少公告ID' },
        { status: 400 }
      )
    }

    // 删除公告
    const { error: deleteError } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `删除公告失败: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '公告删除成功'
    })

  } catch (error: any) {
    console.error('Delete announcement error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '删除失败' },
      { status: 500 }
    )
  }
} 