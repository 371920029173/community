import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSuperAdminId } from '@/lib/superAdminProtection'

// 审核存储空间修改请求
export async function POST(request: NextRequest) {
  try {
    const { adminId, requestId, action, comment } = await request.json()

    if (!adminId || !requestId || !action) {
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
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 检查是否是超级管理员
    const superAdminId = await getSuperAdminId()
    if (adminId !== superAdminId) {
      return NextResponse.json(
        { success: false, error: '只有超级管理员可以审核请求' },
        { status: 403 }
      )
    }

    // 获取请求详情
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('storage_modification_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json(
        { success: false, error: '请求不存在' },
        { status: 404 }
      )
    }

    if (requestData.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '该请求已被处理' },
        { status: 400 }
      )
    }

    // 更新请求状态
    const { error: updateError } = await supabaseAdmin
      .from('storage_modification_requests')
      .update({
        status: action,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `更新请求状态失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 如果审核通过，执行存储空间修改
    if (action === 'approved') {
      const { error: storageUpdateError } = await supabaseAdmin
        .from('users')
        .update({ 
          storage_limit: requestData.new_limit,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.target_user_id)

      if (storageUpdateError) {
        console.error('更新存储空间失败:', storageUpdateError)
        return NextResponse.json(
          { success: false, error: '审核通过但更新存储空间失败' },
          { status: 500 }
        )
      }

      // 记录到存储管理日志
      try {
        await supabaseAdmin
          .from('storage_management_logs')
          .insert({
            admin_id: adminId,
            target_user_id: requestData.target_user_id,
            action: 'approved_storage_request',
            old_limit: requestData.old_limit,
            new_limit: requestData.new_limit,
            reason: `审核通过: ${comment || '无备注'}`
          })
      } catch (logError) {
        console.error('记录存储管理日志失败:', logError)
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approved' ? '审核通过，存储空间已修改' : '审核已拒绝',
      data: {
        requestId,
        action,
        comment
      }
    })

  } catch (error: any) {
    console.error('Review storage modification request error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}


