import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// 简单稳定的用户资料获取
export async function GET(request: NextRequest) {
  try {
    console.log('=== /api/profile/me GET 开始 ===')
    
    const userId = request.headers.get('x-user-id')
    console.log('用户ID:', userId)
    
    if (!userId) {
      console.error('缺少用户ID')
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 使用环境变量创建客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('环境变量检查:', {
      supabaseUrl: supabaseUrl ? '✅' : '❌',
      serviceRoleKey: serviceRoleKey ? '✅' : '❌',
      supabaseUrlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'N/A',
      serviceRoleKeyValue: serviceRoleKey ? serviceRoleKey.substring(0, 30) + '...' : 'N/A'
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('服务器配置错误：环境变量缺失')
      return NextResponse.json({ success: false, error: '服务器配置错误：环境变量缺失' }, { status: 500 })
    }

    console.log('开始创建 Supabase 客户端...')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('Supabase 客户端创建成功')

    console.log('开始查询用户资料...')
    // 查询用户资料
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, nickname, is_admin, is_moderator, avatar_url, created_at, storage_used, storage_limit')
      .eq('id', userId)
      .single()

    console.log('数据库查询结果:', { 
      hasData: !!data, 
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code
    })

    if (error) {
      console.error('数据库查询错误:', error)
      return NextResponse.json({ success: false, error: error.message || '用户不存在' }, { status: 404 })
    }

    console.log('查询成功，用户:', data?.username)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 异常:', error.message, error.stack)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  } finally {
    console.log('=== /api/profile/me GET 结束 ===')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: '服务器配置错误' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, nickname, is_admin, is_moderator, avatar_url, created_at, storage_used, storage_limit')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: '获取资料失败' }, { status: 500 })
  }
}






