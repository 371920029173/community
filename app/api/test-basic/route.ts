import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== 基础 Edge Runtime 测试开始 ===')
    
    // 1. 测试基本响应
    const basicTest = {
      message: 'Edge Runtime 基本功能正常',
      timestamp: new Date().toISOString(),
      runtime: 'edge',
      userAgent: request.headers.get('user-agent'),
      method: request.method
    }
    
    console.log('✅ 基本响应测试通过')
    
    // 2. 测试环境变量访问
    const envTest = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 存在' : '❌ 缺失',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 存在' : '❌ 缺失',
      // 测试其他环境变量
      DEBUG: process.env.DEBUG || 'undefined',
      LOG_LEVEL: process.env.LOG_LEVEL || 'undefined'
    }
    
    console.log('环境变量测试结果:', envTest)
    
    // 3. 测试动态导入（不执行，只测试导入）
    let importTest: { status: string; error: string | null } = { status: 'pending', error: null }
    try {
      console.log('测试动态导入...')
      const { createClient } = await import('@supabase/supabase-js')
      console.log('✅ Supabase 动态导入成功')
      importTest = { status: 'success', error: null }
    } catch (error: any) {
      console.log('❌ Supabase 动态导入失败:', error.message)
      importTest = { status: 'failed', error: error.message }
    }
    
    // 4. 测试 fetch 功能
    let fetchTest: { status: string; error: string | null } = { status: 'pending', error: null }
    try {
      console.log('测试 fetch 功能...')
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Pages-Edge-Runtime-Test'
        }
      })
      
      if (response.ok) {
        console.log('✅ Fetch 功能正常')
        fetchTest = { status: 'success', error: null }
      } else {
        console.log('❌ Fetch 响应异常:', response.status)
        fetchTest = { status: 'failed', error: `HTTP ${response.status}` }
      }
    } catch (error: any) {
      console.log('❌ Fetch 功能失败:', error.message)
      fetchTest = { status: 'failed', error: error.message }
    }
    
    const result = {
      success: true,
      message: 'Edge Runtime 基础测试完成',
      tests: {
        basic: basicTest,
        environment: envTest,
        import: importTest,
        fetch: fetchTest
      },
      timestamp: new Date().toISOString()
    }
    
    console.log('=== 基础 Edge Runtime 测试完成 ===')
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('❌ 基础测试 API 异常:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
