import { NextRequest, NextResponse } from 'next/server'

// export const runtime = 'edge' // 临时禁用 Edge Runtime 解决 Supabase 兼容性问题
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    console.log('Profile API: 开始查询用户', userId)
    
    // 添加重试机制，解决网络问题
    let data, error
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        const result = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        data = result.data
        error = result.error
        
        if (!error) break
        
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`Profile API: 重试 ${retryCount}/${maxRetries}`, error.message)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      } catch (retryError) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`Profile API: 重试 ${retryCount}/${maxRetries}`, retryError)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        } else {
          throw retryError
        }
      }
    }

    if (error) {
      console.error('Profile API: Supabase 查询错误', error)
      return NextResponse.json({ success: false, error: error.message }, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    console.log('Profile API: 查询成功', data?.username)
    return NextResponse.json({ success: true, data }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('Profile API: 异常错误', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}






