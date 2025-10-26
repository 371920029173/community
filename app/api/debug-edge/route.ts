import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // 测试环境变量访问
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_RULE_KEY

    console.log('Environment variables check:')
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Present' : '❌ Missing')
    console.log('SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Present' : '❌ Missing')

    // 测试动态导入
    let supabaseClient = null
    try {
      const { createClient } = await import('@supabase/supabase-js')
      supabaseClient = createClient(supabaseUrl || '', serviceRoleKey || '')
      console.log('✅ Supabase client created successfully')
    } catch (error) {
      console.error('❌ Supabase client creation failed:', error)
    }

    // 测试简单的数据库查询
    let queryResult = null
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('count')
          .limit(1)
        
        if (error) {
          console.error('❌ Database query failed:', error)
          queryResult = { error: error.message }
        } else {
          console.log('✅ Database query successful')
          queryResult = { success: true, data }
        }
      } catch (error: any) {
        console.error('❌ Database query exception:', error)
        queryResult = { error: error.message }
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        environment: {
          supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
          serviceRoleKey: serviceRoleKey ? 'Present' : 'Missing'
        },
        supabaseClient: supabaseClient ? 'Created' : 'Failed',
        queryResult
      }
    })
  } catch (error: any) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
