import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // 最基础的测试 - 不依赖任何外部库
    const result = {
      success: true,
      message: 'Edge Runtime 最基础测试成功',
      timestamp: new Date().toISOString(),
      runtime: 'edge',
      userAgent: request.headers.get('user-agent'),
      method: request.method,
      url: request.url,
      // 测试环境变量访问
      envTest: {
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 存在' : '❌ 缺失',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 存在' : '❌ 缺失',
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
