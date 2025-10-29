import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
      success: true,
      env: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
        hasAnonKey: !!anonKey,
        url: supabaseUrl || 'MISSING',
        serviceKeyLength: serviceRoleKey?.length || 0,
        anonKeyLength: anonKey?.length || 0,
        serviceKeyStart: serviceRoleKey?.substring(0, 30) || 'MISSING',
        serviceKeyEnd: serviceRoleKey?.substring((serviceRoleKey?.length || 0) - 20) || 'MISSING',
        // 验证是否是完整的 JWT（应该以 eyJ 开头）
        isValidJWTFormat: serviceRoleKey?.startsWith('eyJ') || false
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || String(error) 
    }, { status: 500 })
  }
}

