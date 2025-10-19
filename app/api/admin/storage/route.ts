import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
import { ensureSuperAdminProtection, getSuperAdminId } from '@/lib/superAdminProtection'

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
      .select('is_admin')
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

    // 更新用户存储限制
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ storage_limit: newLimit })
      .eq('id', targetUserId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `更新失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 记录操作日志
    const { error: logError } = await supabaseAdmin
      .from('storage_management_logs')
      .insert({
        admin_id: adminId,
        target_user_id: targetUserId,
        action: 'set_storage',
        old_limit: oldLimit,
        new_limit: newLimit,
        reason: reason || '管理员手动调整'
      })

    if (logError) {
      console.error('Failed to log storage management action:', logError)
    }

    return NextResponse.json({
      success: true,
      message: '存储空间修改成功',
      data: {
        oldLimit,
        newLimit,
        targetUserId
      }
    })

  } catch (error: any) {
    console.error('Storage management error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}

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
      .select('is_admin')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData || !adminData.is_admin) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 确保超级管理员权限正常
    const protectionResult = await ensureSuperAdminProtection()
    if (!protectionResult.success) {
      console.error('超级管理员保护检查失败:', protectionResult.error)
    }

    // 获取所有用户的存储使用情况
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, nickname, storage_limit, storage_used, created_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json(
        { success: false, error: `获取用户列表失败: ${usersError.message}` },
        { status: 500 }
      )
    }

    // 获取存储管理日志 - 如果表不存在则跳过
    let logs = []
    try {
      const { data: logsData, error: logsError } = await supabaseAdmin
        .from('storage_management_logs')
        .select(`
          *,
          admin:users!storage_management_logs_admin_id_fkey(username, nickname),
          target_user:users!storage_management_logs_target_user_id_fkey(username, nickname)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (logsError) {
        console.error('Failed to fetch storage management logs:', logsError)
      } else {
        logs = logsData || []
      }
    } catch (error) {
      console.log('Storage management logs table may not exist yet:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        users,
        logs: logs
      }
    })

  } catch (error: any) {
    console.error('Get storage info error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取信息失败' },
      { status: 500 }
    )
  }
} 