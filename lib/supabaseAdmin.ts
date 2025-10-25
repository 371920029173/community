import { createClient } from '@supabase/supabase-js'

// 管理员客户端，使用service role key绕过RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 创建supabaseAdmin客户端
let supabaseAdmin: any

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase Admin环境变量未配置！')
  console.error('URL:', supabaseUrl ? '✅' : '❌')
  console.error('Service Role Key:', serviceRoleKey ? '✅' : '❌')
  throw new Error('Supabase admin配置缺失')
} else {
  // 在 Edge Runtime 中使用简化的配置，避免兼容性问题
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // 添加 Edge Runtime 兼容性配置
    global: {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'User-Agent': 'Cloudflare-Pages-Edge-Runtime'
      }
    },
    // 添加重试配置
    db: {
      schema: 'public'
    }
  })
  
  console.log('✅ Supabase Admin 客户端已创建')
}

export { supabaseAdmin }







