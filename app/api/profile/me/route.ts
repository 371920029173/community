import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// 创建 Supabase 客户端的辅助函数
async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing environment variables')
  }

  // 清理并验证 key（移除所有空白字符，包括换行）
  const cleanKey = serviceRoleKey.trim().replace(/\s+/g, '')
  
  // 验证 key 格式和长度
  if (!cleanKey.startsWith('eyJ')) {
    throw new Error(`Invalid API key format: ${cleanKey.substring(0, 30)}...`)
  }
  
  // Service Role Key 的标准长度应该是 219 字符
  // 如果长度不对，可能是配置错误
  if (cleanKey.length !== 219) {
    console.warn(`⚠️ Service Role Key length is ${cleanKey.length}, expected 219`)
  }

  // 在 Edge Runtime 中创建 Supabase 客户端
  // 注意：Supabase JS 客户端会自动处理 apikey header，不需要手动设置
  return createClient(supabaseUrl, cleanKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 })
    }

    try {
      const supabase = await createSupabaseClient()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // 提供详细的错误信息用于调试
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const cleanKey = (serviceRoleKey?.trim().replace(/\s+/g, '') || '')

        return NextResponse.json({ 
          success: false, 
          error: error.message || 'Database query failed',
          debug: {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            keyLength: cleanKey.length,
            keyStart: cleanKey.substring(0, 30),
            keyEnd: cleanKey.substring(Math.max(0, cleanKey.length - 20)),
            url: supabaseUrl,
            isValidKeyFormat: cleanKey.startsWith('eyJ')
          }
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } catch (setupError: any) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to initialize Supabase client',
        details: setupError.message || String(setupError)
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Request processing failed',
      details: error?.message || String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 })
    }

    try {
      const supabase = await createSupabaseClient()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const cleanKey = (serviceRoleKey?.trim().replace(/\s+/g, '') || '')

        return NextResponse.json({ 
          success: false, 
          error: error.message || 'Database query failed',
          debug: {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            keyLength: cleanKey.length,
            keyStart: cleanKey.substring(0, 30),
            keyEnd: cleanKey.substring(Math.max(0, cleanKey.length - 20)),
            url: supabaseUrl,
            isValidKeyFormat: cleanKey.startsWith('eyJ')
          }
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } catch (setupError: any) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to initialize Supabase client',
        details: setupError.message || String(setupError)
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Request processing failed',
      details: error?.message || String(error)
    }, { status: 500 })
  }
}
