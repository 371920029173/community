# Web 项目问题修复指南

本文档记录在开发和部署过程中遇到的各种问题及其解决方案。

---

## Supabase 连接问题修复指南

### 问题描述

在 Next.js 15 + Edge Runtime + Cloudflare Pages 环境中，Supabase 客户端无法正常连接，特别是在使用 `runtime = 'edge'` 的 API 路由中。

### 常见错误

1. **错误：`createClient is not a function`**
   - 原因：在 Edge Runtime 中直接导入 `createClient` 可能失败
   - 解决：使用动态导入 `await import('@supabase/supabase-js')`

2. **错误：`Supabase Admin环境变量未配置`**
   - 原因：环境变量在 Edge Runtime 中无法正确读取
   - 解决：确保环境变量在 `wrangler.toml` 中正确配置

3. **错误：`Cannot read properties of undefined`**
   - 原因：在 Edge Runtime 中同步创建客户端失败
   - 解决：使用异步函数动态创建客户端

### 解决方案

#### 1. 创建统一的 Supabase Admin 客户端函数

在 `lib/supabase.ts` 或 `lib/supabaseAdmin.ts` 中创建统一的函数：

```typescript
import { createClient } from '@supabase/supabase-js'

// Edge Runtime 兼容：动态创建 Supabase Admin 客户端
// 注意：在 Edge Runtime 中必须使用 async 函数和动态导入
export async function getSupabaseAdmin() {
  try {
    // 动态导入 createClient，确保在 Edge Runtime 中正常工作
    const { createClient } = await import('@supabase/supabase-js')
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase Admin环境变量未配置')
    }

    // 清理并验证 key（移除所有空白字符，包括换行）
    const cleanKey = serviceRoleKey.trim().replace(/\s+/g, '')

    // 验证 key 格式
    if (!cleanKey.startsWith('eyJ')) {
      throw new Error(`Invalid API key format: ${cleanKey.substring(0, 30)}...`)
    }

    // 在 Edge Runtime 中创建 Supabase 客户端
    return createClient(url, cleanKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  } catch (error) {
    console.error('创建 Supabase Admin 客户端失败:', error)
    throw error
  }
}
```

#### 2. 在 API 路由中使用统一函数

**错误示例：**
```typescript
// ❌ 错误：在 Edge Runtime 中直接导入可能失败
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET() {
  const supabaseAdmin = createClient(url, key) // 可能失败
}
```

**正确示例：**
```typescript
// ✅ 正确：使用统一的异步函数
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET() {
  const supabaseAdmin = await getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  
  // 使用 supabaseAdmin...
}
```

#### 3. 确保环境变量正确配置

在 `wrangler.toml` 中配置环境变量：

```toml
[vars]
NEXT_PUBLIC_SUPABASE_URL = "https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "your_anon_key"
SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"
```

**重要提示：**
- 环境变量名称必须以 `NEXT_PUBLIC_` 开头才能在客户端访问
- `SUPABASE_SERVICE_ROLE_KEY` 不应该有 `NEXT_PUBLIC_` 前缀（安全考虑）
- 确保密钥没有多余的空格或换行符

#### 4. 处理错误情况

在 API 路由中添加适当的错误处理：

```typescript
export async function GET() {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable', code: 'E000' },
        { status: 503 }
      )
    }
    
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
    
    if (error) {
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
```

### 关键要点总结

1. **必须使用异步函数**：`getSupabaseAdmin()` 必须是 `async` 函数
2. **必须使用动态导入**：在函数内部使用 `await import('@supabase/supabase-js')`
3. **清理密钥**：使用 `trim().replace(/\s+/g, '')` 移除所有空白字符
4. **验证密钥格式**：检查密钥是否以 `eyJ` 开头（JWT token 标准格式）
5. **统一管理**：所有 API 路由都使用同一个 `getSupabaseAdmin()` 函数
6. **错误处理**：始终检查客户端是否成功创建

### 测试方法

创建一个测试 API 路由来验证连接：

```typescript
// app/api/test-supabase/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '无法创建 Supabase 客户端'
      }, { status: 500 })
    }

    // 测试查询
    const { data, error } = await supabaseAdmin
      .from('your_table')
      .select('id')
      .limit(1)

    return NextResponse.json({
      success: true,
      connected: true,
      queryError: error?.message || null,
      dataCount: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

访问 `/api/test-supabase` 来测试连接是否正常。

---

## Edge Runtime 相关问题

### 问题：动态路由 params 类型错误

**错误信息：**
```
Type error: Route "app/api/xxx/[id]/route.ts" has an invalid "GET" export: 
Type "{ params: { id: string; }; }" is not a valid type for the function's second argument.
```

**解决方案：**

在 Next.js 15 中，动态路由的 `params` 是异步的：

```typescript
// ❌ 错误
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
}

// ✅ 正确
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### 问题：页面需要 Edge Runtime 配置

**错误信息：**
```
The following routes were not configured to run with the Edge Runtime: 
- /forums/[id]
```

**解决方案：**

在页面文件顶部添加：

```typescript
export const runtime = 'edge'
```

---

## 其他常见问题

### 问题：TypeScript 类型错误 - div 不支持 placeholder

**错误信息：**
```
Property 'placeholder' does not exist on type 'DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>'.
```

**解决方案：**

`div` 元素不支持 `placeholder` 属性，只有 `input` 和 `textarea` 支持：

```typescript
// ❌ 错误
<div className="input-field" placeholder="示例">示例</div>

// ✅ 正确
<input type="text" className="input-field" placeholder="示例" readOnly />
```

---

## 部署到 Cloudflare Pages 注意事项

1. **环境变量配置**：确保在 Cloudflare Pages Dashboard 中配置了所有必要的环境变量
2. **构建命令**：使用 `npx @cloudflare/next-on-pages@1` 或 `npm run build:cf`
3. **输出目录**：确保 `wrangler.toml` 中的 `pages_build_output_dir` 指向正确的输出目录
4. **Node.js 版本**：确保使用兼容的 Node.js 版本（通常 18+）

---

## 常见问题：500 Internal Server Error

### 问题：API 路由返回 500 错误，但错误信息不明确

**症状：**
- POST `/api/entries` 返回 500 Internal Server Error
- 控制台没有详细的错误信息
- 无法确定是 Supabase 连接问题还是其他问题

**原因：**
- `getSupabaseAdmin()` 函数抛出错误，但错误没有被正确捕获
- 错误信息不够详细，难以定位问题

**解决方案：**

1. **改进错误捕获**：在调用 `getSupabaseAdmin()` 时使用 try-catch：

```typescript
// ❌ 错误：没有捕获 getSupabaseAdmin 可能抛出的错误
const supabaseAdmin = await getSupabaseAdmin()
if (!supabaseAdmin) {
  return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
}

// ✅ 正确：捕获所有可能的错误
let supabaseAdmin
try {
  supabaseAdmin = await getSupabaseAdmin()
} catch (supabaseError) {
  const errorMsg = supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
  console.error('Failed to get Supabase Admin:', errorMsg)
  return NextResponse.json(
    { 
      error: 'Service unavailable', 
      code: 'E000',
      details: errorMsg,
      hint: 'Check Supabase environment variables in wrangler.toml'
    },
    { status: 503 }
  )
}

if (!supabaseAdmin) {
  return NextResponse.json(
    { error: 'Service unavailable', code: 'E000', details: 'Supabase client is null' },
    { status: 503 }
  )
}
```

2. **改进 getSupabaseAdmin 函数的错误处理**：

```typescript
export async function getSupabaseAdmin() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // 分别检查每个环境变量，提供更详细的错误信息
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL 环境变量未配置')
    }

    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY 环境变量未配置')
    }

    const cleanKey = serviceRoleKey.trim().replace(/\s+/g, '')

    if (!cleanKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY 为空')
    }

    if (!cleanKey.startsWith('eyJ')) {
      throw new Error(`Invalid API key format: expected JWT token starting with 'eyJ', got: ${cleanKey.substring(0, 30)}...`)
    }

    const client = createClient(url, cleanKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })

    if (!client) {
      throw new Error('Failed to create Supabase client: client is null')
    }

    return client
  } catch (error) {
    // 记录详细的错误信息，包括环境变量状态
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('创建 Supabase Admin 客户端失败:', {
      message: errorMessage,
      stack: errorStack,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    throw error
  }
}
```

3. **检查环境变量配置**：
   - 确保 `wrangler.toml` 中的环境变量正确配置
   - 确保 Cloudflare Pages Dashboard 中也配置了相同的环境变量
   - 检查密钥格式是否正确（应该以 `eyJ` 开头）

### 调试步骤

1. **访问测试端点**：访问 `/api/test` 查看 Supabase 连接状态
2. **检查错误响应**：查看 API 返回的 `details` 字段获取详细错误信息
3. **检查控制台日志**：查看服务器端控制台日志（Cloudflare Pages 的实时日志）
4. **验证环境变量**：确认环境变量在运行时是否正确加载

---

## 参考资源

- [Supabase JavaScript Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js Edge Runtime Documentation](https://nextjs.org/docs/app/api-reference/edge)
- [Cloudflare Pages with Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

---

*最后更新：2024年*

