import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase Edge环境变量未配置！')
  console.error('URL:', supabaseUrl ? '✅' : '❌')
  console.error('Service Role Key:', serviceRoleKey ? '✅' : '❌')
  throw new Error('Supabase Edge配置缺失')
}

// Edge Runtime 兼容的 Supabase 客户端
export const supabaseEdge = createClient(supabaseUrl, serviceRoleKey, {
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

// Edge Runtime 兼容的查询包装器
export async function edgeQuery<T>(
  queryFn: () => any
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn()
    return result
  } catch (error) {
    console.error('Edge Runtime 查询错误:', error)
    return { data: null, error: { message: '查询失败', details: error } }
  }
}
