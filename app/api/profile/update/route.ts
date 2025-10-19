import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabase } from '@/lib/supabase'

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

    // 更新用户信息
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