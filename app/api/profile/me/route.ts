import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// 直接在路由中创建 supabaseAdmin 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin: any = null

if (supabaseUrl && serviceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    console.log('=== /api/profile/me GET 开始 ===')
    console.log('环境变量检查:', {
      supabaseUrl: supabaseUrl ? '✅' : '❌',
      serviceRoleKey: serviceRoleKey ? '✅' : '❌'
    })

    const userId = request.headers.get('x-user-id')
    console.log('用户ID:', userId)
    
    if (!userId) {
      console.log('❌ 缺少用户ID')
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 检查 supabaseAdmin 是否可用
    if (!supabaseAdmin) {
      console.error('❌ supabaseAdmin 未初始化')
      return NextResponse.json({ success: false, error: '数据库连接失败' }, { status: 500 })
    }

    console.log('✅ supabaseAdmin 已初始化，开始查询用户资料')
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ 查询用户资料失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    console.log('✅ 用户资料查询成功:', data?.username)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('❌ 获取用户资料异常:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 检查 supabaseAdmin 是否可用
    if (!supabaseAdmin) {
      console.error('supabaseAdmin 未初始化')
      return NextResponse.json({ success: false, error: '数据库连接失败' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('查询用户资料失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('获取用户资料异常:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}






