import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 测试：直接返回环境变量和基本信息
    const result = {
      success: true,
      message: 'Edge Runtime 测试',
      userId,
      envCheck: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing',
      },
      // 暂时不查询数据库，先测试 Edge Runtime 基本功能
      testData: {
        timestamp: new Date().toISOString(),
        runtime: 'edge',
      }
    }

    return NextResponse.json(result)
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 测试：直接返回基本信息
    const result = {
      success: true,
      message: 'Edge Runtime 测试',
      userId,
      envCheck: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing',
      },
      testData: {
        timestamp: new Date().toISOString(),
        runtime: 'edge',
      }
    }

    return NextResponse.json(result)
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}