import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // 1. 测试基本响应
    const basicTest = {
      message: 'Edge Runtime 基本测试成功',
      timestamp: new Date().toISOString(),
      runtime: 'edge'
    }

    // 2. 测试环境变量访问
    const envTest = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 存在' : '❌ 缺失',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 存在' : '❌ 缺失',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }

    // 3. 测试 Supabase 客户端创建
    let supabaseTest: { status: string; error: string | null } = { status: 'pending', error: null }
    try {
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
        supabaseTest = { status: 'success', error: null }
      }
    } catch (error: any) {
      supabaseTest = { status: 'failed', error: error.message }
    }

    // 4. 测试数据库查询
    let dbTest: { status: string; error: string | null; data: any } = { status: 'pending', error: null, data: null }
    try {
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
          dbTest = { status: 'failed', error: error.message, data: null }
        } else {
          dbTest = { status: 'success', error: null, data }
        }
      } else {
        dbTest = { status: 'failed', error: '环境变量缺失', data: null }
      }
    } catch (error: any) {
      dbTest = { status: 'failed', error: error.message, data: null }
    }

    return NextResponse.json({
      success: true,
      tests: {
        basic: basicTest,
        environment: envTest,
        supabaseClient: supabaseTest,
        database: dbTest
      }
    })
  } catch (error: any) {
    console.error('测试 API 错误:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
