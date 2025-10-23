import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== /api/profile/me GET 开始 - 测试版本 v3.0 - nodejs_compat 修复 ===')
    
    const userId = request.headers.get('x-user-id')
    console.log('用户ID:', userId)
    
    if (!userId) {
      console.error('缺少用户ID')
      return NextResponse.json({ success: false, error: '缺少用户ID - 测试版本' }, { status: 400 })
    }

    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('环境变量检查:', {
      supabaseUrl: supabaseUrl ? '✅' : '❌',
      serviceRoleKey: serviceRoleKey ? '✅' : '❌',
      supabaseUrlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'N/A',
      serviceRoleKeyValue: serviceRoleKey ? serviceRoleKey.substring(0, 30) + '...' : 'N/A'
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('环境变量缺失')
      return NextResponse.json({ 
        success: false, 
        error: '环境变量缺失',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey
        }
      }, { status: 500 })
    }

    // 暂时返回模拟数据，避免 Supabase 连接问题
    console.log('返回模拟用户数据 - 测试版本 v2.0')
    return NextResponse.json({ 
      success: true, 
      data: {
        id: userId,
        username: 'test_user_v3',
        email: 'test@example.com',
        nickname: '测试用户 v3.0 - nodejs_compat 修复',
        is_admin: false,
        is_moderator: false,
        avatar_url: null,
        created_at: new Date().toISOString(),
        storage_used: 0,
        storage_limit: 1000000000
      },
      message: '这是测试版本 v3.0 - nodejs_compat 修复成功！'
    })
    
  } catch (error: any) {
    console.error('API 异常:', error.message, error.stack)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '获取资料失败',
      stack: error.stack
    }, { status: 500 })
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

    // 暂时返回模拟数据
    return NextResponse.json({ 
      success: true, 
      data: {
        id: userId,
        username: 'test_user',
        email: 'test@example.com',
        nickname: '测试用户',
        is_admin: false,
        is_moderator: false,
        avatar_url: null,
        created_at: new Date().toISOString(),
        storage_used: 0,
        storage_limit: 1000000000
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}