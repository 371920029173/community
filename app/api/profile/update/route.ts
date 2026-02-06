import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function PUT(request: NextRequest) {
  try {
    // 从请求头获取认证token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '缺少认证信息' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 验证token并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 401 }
      )
    }

    const { username, nickname_color } = await request.json()

    // 验证输入
    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名不能为空' },
        { status: 400 }
      )
    }

    if (username.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: '用户名至少需要2个字符' },
        { status: 400 }
      )
    }

    // 检查用户名是否已被其他用户使用
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已被使用' },
        { status: 400 }
      )
    }

    // 更新 users 表
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        username: username.trim(),
        nickname_color: nickname_color || '#3B82F6',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('更新用户信息失败:', updateError)
      return NextResponse.json(
        { success: false, error: '更新失败' },
        { status: 500 }
      )
    }

    // 同步更新 Auth 的 email，使改名后仍能用新用户名登录
    const newEmail = `${username.trim()}@fileshare.local`
    if (user.email !== newEmail) {
      try {
        const supabaseAdmin = await getSupabaseAdmin()
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email: newEmail })
        if (authUpdateError) {
          console.error('同步 Auth 邮箱失败:', authUpdateError)
          return NextResponse.json(
            { success: false, error: '用户名已更新，但登录邮箱同步失败，请稍后重试或联系管理员' },
            { status: 500 }
          )
        }
      } catch (authErr: any) {
        console.error('同步 Auth 邮箱异常:', authErr)
        return NextResponse.json(
          { success: false, error: '登录信息同步失败，请稍后重试' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedUser
    })

  } catch (error: any) {
    console.error('更新个人资料失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    )
  }
} 