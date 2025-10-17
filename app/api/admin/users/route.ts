import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureSuperAdminProtection, getSuperAdminId } from '@/lib/superAdminProtection'

export async function PATCH(request: NextRequest) {
  try {
    const { adminId, targetUserId, field, value } = await request.json()

    if (!adminId || !targetUserId || !field) {
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
        { success: false, error: '权限不足' },
        { status: 403 }
      )
    }

    // 验证字段名
    if (!['is_admin', 'is_moderator'].includes(field)) {
      return NextResponse.json(
        { success: false, error: '无效的字段名' },
        { status: 400 }
      )
    }

    // 检查是否尝试操作超级管理员账号
    const superAdminId = await getSuperAdminId()
    if (superAdminId && targetUserId === superAdminId) {
      // 获取目标用户信息
      const { data: targetUser, error: targetUserError } = await supabaseAdmin
        .from('users')
        .select('username, is_admin, is_moderator')
        .eq('id', targetUserId)
        .single()

      if (targetUserError || !targetUser) {
        return NextResponse.json(
          { success: false, error: '无法获取目标用户信息' },
          { status: 404 }
        )
      }

      // 如果是371920029173账号，拒绝任何权限修改
      if (targetUser.username === '371920029173') {
        return NextResponse.json(
          { 
            success: false, 
            error: '无法修改超级管理员账号的权限，该账号权限受保护' 
          },
          { status: 403 }
        )
      }
    }

    // 更新用户角色
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ [field]: value })
      .eq('id', targetUserId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `更新失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '用户权限更新成功'
    })

  } catch (error: any) {
    console.error('Update user role error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
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

    // 获取所有用户
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (usersError) {
      return NextResponse.json(
        { success: false, error: `获取用户列表失败: ${usersError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: users || []
    })

  } catch (error: any) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取用户列表失败' },
      { status: 500 }
    )
  }
}




