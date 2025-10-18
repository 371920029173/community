import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 371920029173账号的强保险机制
export async function ensureSuperAdminProtection() {
  try {
    // 查找371920029173账号
    const { data: superAdmin, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, is_admin, is_moderator')
      .eq('username', '371920029173')
      .single()

    if (findError) {
      console.error('查找超级管理员账号失败:', findError)
      return { success: false, error: findError.message }
    }

    if (!superAdmin) {
      console.log('超级管理员账号不存在')
      return { success: false, error: '超级管理员账号不存在' }
    }

    // 检查权限，如果不是管理员或审核员，立即修复
    if (!superAdmin.is_admin || !superAdmin.is_moderator) {
      console.log('超级管理员权限异常，正在修复...', {
        id: superAdmin.id,
        username: superAdmin.username,
        is_admin: superAdmin.is_admin,
        is_moderator: superAdmin.is_moderator
      })

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          is_admin: true,
          is_moderator: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', superAdmin.id)

      if (updateError) {
        console.error('修复超级管理员权限失败:', updateError)
        return { success: false, error: updateError.message }
      }

      console.log('超级管理员权限已修复')
      return { success: true, message: '超级管理员权限已修复' }
    }

    console.log('超级管理员权限正常')
    return { success: true, message: '超级管理员权限正常' }

  } catch (error: any) {
    console.error('超级管理员保护机制错误:', error)
    return { success: false, error: error.message }
  }
}

// 检查是否尝试操作超级管理员账号
export function isSuperAdminOperation(targetUserId: string, operationType: string = 'modify') {
  // 这里我们需要通过用户名来检查，因为targetUserId可能是UUID
  // 在实际使用中，我们需要先查询用户信息
  return {
    isSuperAdmin: false, // 将在具体API中实现
    shouldBlock: false
  }
}

// 获取超级管理员账号ID
export async function getSuperAdminId() {
  try {
    const { data: superAdmin, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', '371920029173')
      .single()

    if (error || !superAdmin) {
      return null
    }

    return superAdmin.id
  } catch (error) {
    console.error('获取超级管理员ID失败:', error)
    return null
  }
}


