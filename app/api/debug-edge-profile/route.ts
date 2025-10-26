import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // 1. 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const hasUrl = !!supabaseUrl
    const hasKey = !!serviceRoleKey
    const urlLength = supabaseUrl?.length || 0
    const keyLength = serviceRoleKey?.length || 0
    
    // 2. 尝试动态导入
    let importSuccess = false
    let clientCreated = false
    let querySuccess = false
    let errorMessage = ''
    
    try {
      const { createClient } = await import('@supabase/supabase-js')
      importSuccess = true
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          global: {
            fetch: fetch,
          },
        })
        clientCreated = true
        
        // 3. 尝试简单查询
        const { data, error } = await supabase
          .from('users')
          .select('id, username')
          .limit(1)
        
        if (error) {
          querySuccess = false
          errorMessage = error.message
        } else {
          querySuccess = true
        }
      }
    } catch (error: any) {
      errorMessage = error.message
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        env: {
          hasUrl,
          hasKey,
          urlLength,
          keyLength,
        },
        steps: {
          importSuccess,
          clientCreated,
          querySuccess,
        },
        error: errorMessage || 'No error',
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 })
  }
}

