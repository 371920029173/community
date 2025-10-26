import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== /api/profile/me 开始执行 ===')
    
    const userId = request.headers.get('x-user-id')
    console.log('用户ID:', userId)
    
    if (!userId) {
      console.log('❌ 缺少用户ID')
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('环境变量检查:')
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ 存在' : '❌ 缺失')
    console.log('- SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ 存在' : '❌ 缺失')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.log('❌ 环境变量未配置')
      return NextResponse.json({ 
        success: false, 
        error: '服务器配置错误',
        debug: {
          url: !!supabaseUrl,
          key: !!serviceRoleKey
        }
      }, { status: 500 })
    }

    // 创建 Supabase 客户端
    console.log('创建 Supabase 客户端...')
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
    
    console.log('✅ Supabase 客户端创建成功')

    // 执行查询
    console.log('执行数据库查询...')
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.log('❌ Supabase 查询错误:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        debug: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }, { status: 404 })
    }

    console.log('✅ 查询成功，返回数据')
    return NextResponse.json({ success: true, data })
    
  } catch (error: any) {
    console.error('❌ API 异常错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '获取资料失败',
      debug: {
        name: error.name,
        stack: error.stack
      }
    }, { status: 500 })
  }
}
