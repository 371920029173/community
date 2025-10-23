import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Supabase 网络配置测试开始 ===')
    
    // 1. 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('环境变量状态:', {
      supabaseUrl: supabaseUrl ? '✅' : '❌',
      serviceRoleKey: serviceRoleKey ? '✅' : '❌',
      anonKey: anonKey ? '✅' : '❌'
    })
    
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return NextResponse.json({ 
        success: false, 
        error: '环境变量缺失',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey,
          anonKey: !!anonKey
        }
      }, { status: 500 })
    }
    
    // 2. 测试 Service Role 客户端
    console.log('测试 Service Role 客户端...')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'User-Agent': 'Cloudflare-Pages-Edge-Runtime-Test'
        }
      }
    })
    
    // 3. 测试数据库连接
    console.log('测试数据库连接...')
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .limit(1)
    
    if (usersError) {
      console.error('数据库连接失败:', usersError)
      return NextResponse.json({
        success: false,
        error: '数据库连接失败',
        details: {
          message: usersError.message,
          code: usersError.code,
          details: usersError.details,
          hint: usersError.hint
        }
      }, { status: 500 })
    }
    
    // 4. 测试 Anon 客户端
    console.log('测试 Anon 客户端...')
    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          'User-Agent': 'Cloudflare-Pages-Edge-Runtime-Test'
        }
      }
    })
    
    // 5. 测试网络连接
    console.log('测试网络连接...')
    const { data: healthCheck, error: healthError } = await supabaseAnon
      .from('users')
      .select('count')
      .limit(1)
    
    console.log('网络测试结果:', {
      healthCheck: !!healthCheck,
      healthError: healthError?.message
    })
    
    // 6. 获取请求信息
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const cfRay = request.headers.get('cf-ray') || 'Unknown'
    const cfCountry = request.headers.get('cf-ipcountry') || 'Unknown'
    
    console.log('请求信息:', {
      userAgent,
      cfRay,
      cfCountry
    })
    
    return NextResponse.json({
      success: true,
      message: 'Supabase 网络配置正常',
      details: {
        environment: {
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          hasServiceRoleKey: !!serviceRoleKey,
          hasAnonKey: !!anonKey
        },
        database: {
          usersCount: users?.length || 0,
          connectionStatus: '✅ 正常'
        },
        network: {
          userAgent,
          cfRay,
          cfCountry,
          edgeRuntime: '✅ 正常'
        }
      }
    })
    
  } catch (error: any) {
    console.error('网络测试异常:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      error: '网络测试失败',
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 })
  } finally {
    console.log('=== Supabase 网络配置测试结束 ===')
  }
}
