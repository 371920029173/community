import { NextRequest, NextResponse } from 'next/server'

// Cloudflare Pages 要求必须使用 Edge Runtime
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Node.js Runtime 测试开始 ===')
    
    // 1. 测试基本响应
    const basicTest = {
      message: 'Node.js Runtime 基本功能正常',
      timestamp: new Date().toISOString(),
      runtime: 'nodejs',
      userAgent: request.headers.get('user-agent'),
      method: request.method
    }
    
    console.log('✅ 基本响应测试通过')
    
    // 2. 测试环境变量访问
    const envTest = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 存在' : '❌ 缺失',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 存在' : '❌ 缺失',
      DEBUG: process.env.DEBUG || 'undefined',
      LOG_LEVEL: process.env.LOG_LEVEL || 'undefined'
    }
    
    console.log('环境变量测试结果:', envTest)
    
    // 3. 测试 Supabase 客户端创建
    let supabaseTest: { status: string; error: string | null } = { status: 'pending', error: null }
    try {
      console.log('测试 Supabase 客户端创建...')
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !serviceRoleKey) {
        supabaseTest = { status: 'failed', error: '环境变量缺失' }
      } else {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        })
        console.log('✅ Supabase 客户端创建成功')
        supabaseTest = { status: 'success', error: null }
      }
    } catch (error: any) {
      console.log('❌ Supabase 客户端创建失败:', error.message)
      supabaseTest = { status: 'failed', error: error.message }
    }
    
    // 4. 测试数据库查询
    let dbTest: { status: string; error: string | null; data: any } = { status: 'pending', error: null, data: null }
    try {
      console.log('测试数据库查询...')
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        })
        
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1)
        
        if (error) {
          console.log('❌ 数据库查询失败:', error.message)
          dbTest = { status: 'failed', error: error.message, data: null }
        } else {
          console.log('✅ 数据库查询成功')
          dbTest = { status: 'success', error: null, data }
        }
      } else {
        dbTest = { status: 'failed', error: '环境变量缺失', data: null }
      }
    } catch (error: any) {
      console.log('❌ 数据库查询异常:', error.message)
      dbTest = { status: 'failed', error: error.message, data: null }
    }
    
    const result = {
      success: true,
      message: 'Node.js Runtime 测试完成',
      tests: {
        basic: basicTest,
        environment: envTest,
        supabaseClient: supabaseTest,
        database: dbTest
      },
      timestamp: new Date().toISOString()
    }
    
    console.log('=== Node.js Runtime 测试完成 ===')
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('❌ Node.js Runtime 测试异常:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
