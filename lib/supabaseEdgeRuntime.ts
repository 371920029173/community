// Cloudflare Pages Edge Runtime 兼容的 Supabase 客户端
import { createClient } from '@supabase/supabase-js'

// Edge Runtime 环境变量获取函数
function getEdgeEnvVar(name: string): string {
  // 在 Cloudflare Pages Edge Runtime 中，环境变量通过 process.env 访问
  // 但可能需要特殊处理
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || ''
  }
  return ''
}

// 创建 Edge Runtime 兼容的 Supabase 客户端
export function createEdgeSupabaseClient() {
  const supabaseUrl = getEdgeEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getEdgeEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Missing environment variables: URL=${!!supabaseUrl}, Key=${!!serviceRoleKey}`)
  }

  // 使用 Edge Runtime 兼容的配置
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: (url, options = {}) => {
        // 在 Edge Runtime 中使用原生 fetch
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
}

// Edge Runtime 查询包装器，提供更好的错误处理
export async function edgeQuery<T>(
  queryFn: () => any
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn()
    return result
  } catch (error: any) {
    console.error('Edge Runtime 查询错误:', error)
    return { 
      data: null, 
      error: { 
        message: error.message || '查询失败', 
        details: error 
      } 
    }
  }
}
