import { createClient } from '@supabase/supabase-js'

// Edge Runtime 兼容的环境变量获取
function getEnvVar(name: string): string {
  // 在 Edge Runtime 中，环境变量可能通过不同的方式访问
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || ''
  }
  // 如果 process.env 不可用，尝试其他方式
  return ''
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

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
