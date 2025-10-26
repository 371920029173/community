import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // 最基础的测试
    return NextResponse.json({ 
      success: true, 
      message: 'Edge Runtime is working',
      timestamp: Date.now()
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || String(error) 
    }, { status: 500 })
  }
}

