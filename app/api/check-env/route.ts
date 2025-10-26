import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    return NextResponse.json({
      success: true,
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
        urlStart: supabaseUrl?.substring(0, 40) || 'MISSING',
        urlEnd: supabaseUrl?.substring(supabaseUrl.length - 20) || 'MISSING',
        keyStart: serviceRoleKey?.substring(0, 30) || 'MISSING',
        keyLength: serviceRoleKey?.length || 0,
        // 检查是否有拼写错误
        urlHasDoubleN: supabaseUrl?.includes('mmnn') || false,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

