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
  
  // 在构建时不抛出错误，而是创建一个假的客户端
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ 构建时跳过Supabase Admin配置检查')
    // 创建一个假的客户端，避免构建失败
    supabaseAdmin = createClient('https://dummy.supabase.co', 'dummy-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } else {
    // 在运行时也创建一个假的客户端，避免应用崩溃
    console.warn('⚠️ 运行时Supabase Admin配置缺失，创建假客户端')
    supabaseAdmin = createClient('https://dummy.supabase.co', 'dummy-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
} else {
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export { supabaseAdmin }







