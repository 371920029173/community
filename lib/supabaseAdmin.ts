import { createClient } from '@supabase/supabase-js'

// Edge Runtime 兼容：动态创建 Supabase Admin 客户端
export async function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Admin环境变量未配置')
  }

  // 清理并验证 key
  const cleanKey = serviceRoleKey.trim().replace(/\s+/g, '')

  // 在 Edge Runtime 中创建 Supabase 客户端
  return createClient(supabaseUrl, cleanKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// 为了兼容性，保留原有的导出方式（在非 Edge Runtime 中使用）
let supabaseAdmin: any = null

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceRoleKey) {
    const cleanKey = serviceRoleKey.trim().replace(/\s+/g, '')
    supabaseAdmin = createClient(supabaseUrl, cleanKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
} catch (error) {
  console.warn('Supabase Admin 初始化失败（可能是 Edge Runtime）:', error)
}

export { supabaseAdmin }
