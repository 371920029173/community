import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== 简单测试 API 开始 ===')
    
    return NextResponse.json({ 
      success: true, 
      message: '简单测试成功！Edge Runtime 工作正常',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    })
    
  } catch (error: any) {
    console.error('简单测试 API 异常:', error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '简单测试失败'
    }, { status: 500 })
  }
}
