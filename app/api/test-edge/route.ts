import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  // 不依赖任何外部内容，只返回基本 JSON
  return NextResponse.json({ 
    success: true,
    message: 'Edge Runtime is working',
    timestamp: Date.now(),
    env: {
      hasProcess: typeof process !== 'undefined',
      hasEnv: typeof process?.env !== 'undefined',
      nodeEnv: process?.env?.NODE_ENV || 'not set',
    }
  })
}

