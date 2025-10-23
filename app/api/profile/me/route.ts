import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// 环境变量获取函数，带重试机制
async function getEnvVars() {
  let retries = 3
  while (retries > 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && serviceRoleKey) {
      return { supabaseUrl, serviceRoleKey }
    }
    
    console.log(`环境变量获取失败，剩余重试次数: ${retries - 1}`)
    retries--
    await new Promise(resolve => setTimeout(resolve, 100)) // 等待100ms
  }
  
  throw new Error('环境变量获取失败')
}

// 创建 Supabase 客户端，带重试机制
async function createSupabaseClient() {
  const { supabaseUrl, serviceRoleKey } = await getEnvVars()
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'User-Agent': 'Cloudflare-Pages-Edge-Runtime'
      }
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 使用重试机制创建客户端
    const supabase = await createSupabaseClient()

    // 查询用户资料，带重试机制
    let retries = 2
    let data, error
    
    while (retries > 0) {
      const result = await supabase
        .from('users')
        .select('id, username, email, nickname, is_admin, is_moderator, avatar_url, created_at, storage_used, storage_limit')
        .eq('id', userId)
        .single()
      
      data = result.data
      error = result.error
      
      if (!error) break
      
      console.log(`数据库查询失败，剩余重试次数: ${retries - 1}`, error.message)
      retries--
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 等待200ms
      }
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message || '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 异常:', error.message)
    return NextResponse.json({ success: false, error: '获取资料失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 使用重试机制创建客户端
    const supabase = await createSupabaseClient()

    // 查询用户资料，带重试机制
    let retries = 2
    let data, error
    
    while (retries > 0) {
      const result = await supabase
        .from('users')
        .select('id, username, email, nickname, is_admin, is_moderator, avatar_url, created_at, storage_used, storage_limit')
        .eq('id', userId)
        .single()
      
      data = result.data
      error = result.error
      
      if (!error) break
      
      retries--
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message || '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}