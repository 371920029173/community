import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureSuperAdminProtection } from '@/lib/superAdminProtection'

export const runtime = 'edge'

// 获取用户通知数量
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      )
    }

    // 确保超级管理员保护
    await ensureSuperAdminProtection()

    // 获取用户信息
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin, is_moderator')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    const notifications = {
      messages: 0,
      fileReview: 0,
      storageRequests: 0
    }

    // 1. 获取未读私信数量
    try {
      const { data: unreadMessages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('sender_id', userId)
        .eq('is_read', false)

      if (!messagesError) {
        notifications.messages = unreadMessages?.length || 0
      }
    } catch (error) {
      console.log('获取私信通知失败:', error)
    }

    // 2. 获取待审核文件数量（仅管理员和审核员）
    if (user.is_admin || user.is_moderator) {
      try {
        const { data: pendingFiles, error: filesError } = await supabaseAdmin
          .from('files')
          .select('id')
          .eq('is_approved', false)

        if (!filesError) {
          notifications.fileReview = pendingFiles?.length || 0
        }
      } catch (error) {
        console.log('获取文件审核通知失败:', error)
      }
    }

    // 3. 获取存储空间修改请求数量（仅超级管理员）
    if (user.is_admin && userId === '371920029173') {
      try {
        const { data: pendingRequests, error: requestsError } = await supabaseAdmin
          .from('storage_modification_requests')
          .select('id')
          .eq('status', 'pending')

        if (!requestsError) {
          notifications.storageRequests = pendingRequests?.length || 0
        }
      } catch (error) {
        console.log('获取存储请求通知失败:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: notifications
    })

  } catch (error: any) {
    console.error('获取通知失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

