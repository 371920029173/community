import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // 检查 key 的开头 - Service Role Key 应该以 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ 开头
    const expectedKeyStart = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ'
    const actualKeyStart = serviceRoleKey?.substring(0, 40)
    const keyMatches = actualKeyStart?.startsWith(expectedKeyStart)
    
    // 检查 key 的结尾
    const expectedKeyEnd = 'Sj-RzeZr2jI'
    const actualKeyEnd = serviceRoleKey?.substring(serviceRoleKey.length - 20)
    const keyEndMatches = actualKeyEnd?.includes(expectedKeyEnd)
    
    return NextResponse.json({
      success: true,
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
        urlValue: supabaseUrl || 'MISSING',
        urlLength: supabaseUrl?.length || 0,
        keyLength: serviceRoleKey?.length || 0,
        expectedLength: 218,
        keyStartMatches: keyMatches,
        keyEndMatches: keyEndMatches,
        actualKeyStart: actualKeyStart || 'MISSING',
        expectedKeyStart: expectedKeyStart.substring(0, 40),
        actualKeyEnd: actualKeyEnd || 'MISSING',
        expectedKeyEnd: expectedKeyEnd,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

