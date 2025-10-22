import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureSuperAdminProtection } from '@/lib/superAdminProtection'

// 超级管理员自己修改存储空间的API
export async function POST(request: NextRequest) {
  try {
    const { newLimit, reason } = await request.json()

    if (!newLimit) {
      return NextResponse.json(
        { success: false, error: '缺少存储限制参数' },
        { status: 400 }
      )
    }

    // 确保超级管理员权限正�?
    const protectionResult = await ensureSuperAdminProtection()
    if (!protectionResult.success) {
      return NextResponse.json(
        { success: false, error: '超级管理员权限异�? },
        { status: 403 }
      )
    }

    // 获取超级管理员账号信�?
    const { data: superAdmin, error: superAdminError } = await supabaseAdmin
      .from('users')
      .select('id, username, storage_limit, storage_used')
      .eq('username', '371920029173')
      .single()

    if (superAdminError || !superAdmin) {
      return NextResponse.json(
        { success: false, error: '超级管理员账号不存在' },
        { status: 404 }
      )
    }

    const oldLimit = superAdmin.storage_limit

    // 检查新限制是否合理
    if (newLimit < superAdmin.storage_used) {
      return NextResponse.json(
        { success: false, error: '新存储限制不能小于已使用的存储空�? },
        { status: 400 }
      )
    }

    // 更新超级管理员的存储限制
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        storage_limit: newLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', superAdmin.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `更新失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 记录操作日志
    try {
      await supabaseAdmin
        .from('storage_management_logs')
        .insert({
          admin_id: superAdmin.id,
          target_user_id: superAdmin.id,
          action: 'self_set_storage',
          old_limit: oldLimit,
          new_limit: newLimit,
          reason: reason || '超级管理员自己调整存储空�?
        })
    } catch (logError) {
      console.error('Failed to log super admin storage management action:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '存储空间修改成功',
      data: {
        oldLimit,
        newLimit,
        username: superAdmin.username
      }
    })

  } catch (error: any) {
    console.error('Super admin storage management error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}


