import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSuperAdminId } from '@/lib/superAdminProtection'

// 创建存储空间修改请求
export async function POST(request: NextRequest) {
  try {
    const { adminId, targetUserId, newLimit, reason } = await request.json()

    if (!adminId || !targetUserId || !newLimit) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证管理员权限
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('is_admin, username')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData || !adminData.is_admin) {
      return NextResponse.json(
        { success: false, error: '权限不足，只有管理员可以执行此操作' },
        { status: 403 }
      )
    }

    // 验证目标用户是否存在
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('username, storage_limit, storage_used')
      .eq('id', targetUserId)
      .single()

    if (targetUserError || !targetUserData) {
      return NextResponse.json(
        { success: false, error: '目标用户不存在' },
        { status: 404 }
      )
    }

    // 检查是否尝试修改超级管理员的存储空间
    if (targetUserData.username === '371920029173') {
      return NextResponse.json(
        { 
          success: false, 
          error: '无法修改超级管理员账号的存储空间，该账号存储空间受保护' 
        },
        { status: 403 }
      )
    }

    const oldLimit = targetUserData.storage_limit

    // 检查新限制是否合理
    if (newLimit < targetUserData.storage_used) {
      return NextResponse.json(
        { success: false, error: '新存储限制不能小于已使用的存储空间' },
        { status: 400 }
      )
    }

    // 创建审核请求
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('storage_modification_requests')
      .insert({
        requester_id: adminId,
        target_user_id: targetUserId,
        old_limit: oldLimit,
        new_limit: newLimit,
        reason: reason || '管理员申请修改存储空间',
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      // 检查是否是表不存在的错误
      if (requestError.message.includes('Could not find the table') || 
          requestError.message.includes('storage_modification_requests')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '存储空间修改审核表不存在，请先在Supabase中执行 create-storage-approval-simple.sql 脚本',
            needsSetup: true
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: `创建审核请求失败: ${requestError.message}` },
        { status: 500 }
      )
    }

    // 检查是否是超级管理员提交的请求
    const superAdminId = await getSuperAdminId()
    const isSuperAdminRequest = adminId === superAdminId
    
    return NextResponse.json({
      success: true,
      message: isSuperAdminRequest 
        ? '存储空间修改请求已提交，等待审核' 
        : '存储空间修改请求已提交，等待超级管理员审核',
      data: {
        requestId: requestData.id,
        targetUser: targetUserData.username,
        oldLimit,
        newLimit
      }
    })

  } catch (error: any) {
    console.error('Create storage modification request error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}

// 获取待审核的请求列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: '缺少管理员ID' },
        { status: 400 }
      )
    }

    // 验证管理员权限
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('is_admin, username')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData || !adminData.is_admin) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 检查是否是超级管理员
    const superAdminId = await getSuperAdminId()
    const isSuperAdmin = adminId === superAdminId

    let query = supabaseAdmin
      .from('storage_modification_requests')
      .select(`
        *,
        requester:users!storage_modification_requests_requester_id_fkey(username, nickname),
        target_user:users!storage_modification_requests_target_user_id_fkey(username, nickname),
        reviewer:users!storage_modification_requests_reviewed_by_fkey(username, nickname)
      `)
      .order('created_at', { ascending: false })

    // 如果不是超级管理员，只能看到自己的请求
    if (!isSuperAdmin) {
      query = query.eq('requester_id', adminId)
    }

    const { data: requests, error: requestsError } = await query

    if (requestsError) {
      // 检查是否是表不存在的错误
      if (requestsError.message.includes('Could not find the table') || 
          requestsError.message.includes('storage_modification_requests')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '存储空间修改审核表不存在，请先在Supabase中执行 create-storage-approval-simple.sql 脚本',
            needsSetup: true
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: `获取请求列表失败: ${requestsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
      isSuperAdmin
    })

  } catch (error: any) {
    console.error('Get storage modification requests error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
}






