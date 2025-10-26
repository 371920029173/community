import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 直接在函数内部创建 Supabase 客户端，避免模块级别的环境变量问题
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Supabase 环境变量未配置')
      return NextResponse.json({ success: false, error: '服务器配置错误' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Cloudflare-Pages-Edge-Runtime',
              ...options.headers,
            },
          })
        }
      }
    })

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Supabase 查询错误:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 直接在函数内部创建 Supabase 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Supabase 环境变量未配置')
      return NextResponse.json({ success: false, error: '服务器配置错误' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Cloudflare-Pages-Edge-Runtime',
              ...options.headers,
            },
          })
        }
      }
    })

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Supabase 查询错误:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}






