import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 })
    }

    // ✅ Edge Runtime 兼容：动态导入并创建 Supabase 客户端
    let errorStep = ''
    try {
      errorStep = 'importing createClient'
      const { createClient } = await import('@supabase/supabase-js')
      
      errorStep = 'reading environment variables'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing environment variables',
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!serviceRoleKey,
            urlLength: supabaseUrl?.length || 0,
            keyLength: serviceRoleKey?.length || 0
          }
        }, { status: 500 })
      }
      
      errorStep = 'creating Supabase client'
      // Edge Runtime 中正确创建 Supabase 客户端
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      errorStep = 'querying database'
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 })
      }

      return NextResponse.json({ success: true, data })
    } catch (innerError: any) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed at step: ${errorStep}`,
        details: innerError?.message || String(innerError),
        stack: innerError?.stack
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Outer error',
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 })
    }

    // ✅ Edge Runtime 兼容：动态导入并创建 Supabase 客户端
    let errorStep = ''
    try {
      errorStep = 'importing createClient'
      const { createClient } = await import('@supabase/supabase-js')
      
      errorStep = 'reading environment variables'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing environment variables',
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!serviceRoleKey,
            urlLength: supabaseUrl?.length || 0,
            keyLength: serviceRoleKey?.length || 0
          }
        }, { status: 500 })
      }
      
      errorStep = 'creating Supabase client'
      // Edge Runtime 中正确创建 Supabase 客户端
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      errorStep = 'querying database'
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 })
      }

      return NextResponse.json({ success: true, data })
    } catch (innerError: any) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed at step: ${errorStep}`,
        details: innerError?.message || String(innerError),
        stack: innerError?.stack
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Outer error',
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 })
  }
}






