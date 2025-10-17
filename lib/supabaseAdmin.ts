import { createClient } from '@supabase/supabase-js'

// 管理员客户端，使用service role key绕过RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 在构建时不抛出错误，而是创建一个假的客户端
if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase Admin环境变量未配置！')
  console.error('URL:', supabaseUrl ? '✅' : '❌')
  console.error('Service Role Key:', serviceRoleKey ? '✅' : '❌')
  
  // 在构建时不抛出错误，而是创建一个假的客户端
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ 构建时跳过Supabase Admin配置检查')
    // 创建一个假的客户端，避免构建失败
    export const supabaseAdmin = createClient('https://dummy.supabase.co', 'dummy-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } else {
    throw new Error('Supabase admin配置缺失，请检查.env.local文件')
  }
} else {
  export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}



