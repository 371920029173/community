import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('=== 控制台调试 API 开始 ===')
    console.log('请求时间:', new Date().toISOString())
    console.log('User-Agent:', request.headers.get('user-agent'))
    console.log('CF-Ray:', request.headers.get('cf-ray'))
    console.log('CF-Country:', request.headers.get('cf-ipcountry'))
    
    return NextResponse.json({ 
      success: true, 
      message: '控制台调试成功！请查看 Cloudflare Pages Functions 日志',
      timestamp: new Date().toISOString(),
      instructions: [
        '1. 访问 Cloudflare Pages 控制台',
        '2. 选择你的项目 community-e7i',
        '3. 点击 "Functions" 标签',
        '4. 查看实时日志',
        '5. 应该看到 "=== 控制台调试 API 开始 ===" 等日志'
      ]
    })
    
  } catch (error: any) {
    console.error('控制台调试 API 异常:', error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '控制台调试失败'
    }, { status: 500 })
  }
}
