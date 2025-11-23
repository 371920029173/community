# Web 应用问题修复记录

本文档记录了网站开发过程中遇到的 Edge Runtime 相关问题及修复方法。

## Edge Runtime 问题总览

### 问题背景
Next.js 的 Edge Runtime 是一个轻量级的运行时环境，用于在边缘网络运行 API 路由。它基于 Web API 标准，不支持完整的 Node.js API，这导致了一些兼容性问题。

### 主要问题类型

1. **Node.js 模块不兼容**
2. **动态导入限制**
3. **Supabase 客户端初始化问题**
4. **文件系统操作限制**

---

## 问题 1: Node.js crypto 模块不可用

### 问题描述
在 Edge Runtime 中尝试使用 `crypto` 模块时出现错误：
```
Error: crypto is not available in Edge Runtime
```

### 出现位置
- `app/api/upload/route.ts`（已注释掉相关代码）

### 修复方法
**方案 1：移除 crypto 依赖（推荐）**
```typescript
// ❌ 错误：Edge Runtime 不支持
// import { createHash } from 'crypto'
// const hash = createHash('md5').update(buffer).digest('hex')

// ✅ 正确：使用 Web Crypto API（如果确实需要哈希）
// const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
// const hashArray = Array.from(new Uint8Array(hashBuffer))
// const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
```

**方案 2：移除 Edge Runtime（如果必须使用 Node.js API）**
```typescript
// 移除这行，使用默认的 Node.js Runtime
// export const runtime = 'edge'
```

### 当前状态
✅ 已修复：在 `app/api/upload/route.ts` 中已注释掉 crypto 相关代码

---

## 问题 2: Supabase 客户端在 Edge Runtime 中的初始化

### 问题描述
Edge Runtime 中直接导入 Supabase 客户端可能导致初始化失败或功能受限。

### 出现位置
- 所有使用 `export const runtime = 'edge'` 的 API 路由

### 修复方法
**使用动态导入和 getSupabaseAdmin 函数**
```typescript
// ✅ 正确：使用动态创建 Supabase 客户端
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  // 在函数内部动态创建客户端
  const supabaseAdmin = await getSupabaseAdmin()
  
  // 使用客户端
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
}
```

### 关键文件
- `lib/supabaseAdmin.ts` - 提供 Edge Runtime 兼容的 Supabase 客户端创建函数

### 当前状态
✅ 已修复：所有 Edge Runtime API 路由都使用 `getSupabaseAdmin()` 动态创建客户端

---

## 问题 3: 文件系统操作限制

### 问题描述
Edge Runtime 不支持 Node.js 的文件系统 API（如 `fs.readFile`、`fs.writeFile` 等）。

### 出现位置
- 文件上传处理
- 文件读取操作

### 修复方法
**使用 Web API 和 Supabase Storage**
```typescript
// ❌ 错误：Edge Runtime 不支持
// import fs from 'fs'
// const fileContent = fs.readFileSync(filePath)

// ✅ 正确：使用 FormData 和 Supabase Storage
const formData = await request.formData()
const file = formData.get('file') as File
const arrayBuffer = await file.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

// 上传到 Supabase Storage
await supabaseAdmin.storage
  .from('bucket-name')
  .upload(filePath, buffer, { contentType: file.type })
```

### 当前状态
✅ 已修复：所有文件操作都通过 Supabase Storage API 进行

---

## 问题 4: 动态导入限制

### 问题描述
Edge Runtime 对动态导入（`import()`）有严格限制，某些模块无法动态导入。

### 修复方法
**在文件顶部静态导入，或使用兼容的替代方案**
```typescript
// ✅ 正确：静态导入
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// ❌ 避免：动态导入可能失败
// const module = await import('some-module')
```

### 当前状态
✅ 已修复：所有必要的模块都使用静态导入

---

## 问题 5: 环境变量访问

### 问题描述
Edge Runtime 中访问环境变量的方式与 Node.js Runtime 略有不同。

### 修复方法
**使用 `process.env`（Edge Runtime 支持）**
```typescript
// ✅ 正确：Edge Runtime 支持 process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 注意：确保环境变量在部署平台（如 Vercel）中正确配置
```

### 当前状态
✅ 已修复：所有环境变量访问都使用 `process.env`

---

## 最佳实践总结

### ✅ 推荐做法

1. **使用 `getSupabaseAdmin()` 动态创建 Supabase 客户端**
   ```typescript
   const supabaseAdmin = await getSupabaseAdmin()
   ```

2. **避免使用 Node.js 特定 API**
   - ❌ `crypto`、`fs`、`path` 等 Node.js 模块
   - ✅ 使用 Web API：`crypto.subtle`、`FormData`、`URL` 等

3. **使用静态导入**
   - ✅ 在文件顶部导入所有需要的模块
   - ❌ 避免在运行时动态导入

4. **处理异步操作**
   - ✅ 使用 `async/await` 处理异步操作
   - ✅ 使用 `Promise.all()` 或 `Promise.allSettled()` 处理并发

### ❌ 避免的做法

1. **不要使用 Node.js 文件系统 API**
2. **不要使用 Node.js crypto 模块（使用 Web Crypto API）**
3. **不要在 Edge Runtime 中使用需要文件系统访问的库**
4. **不要假设所有 Node.js 模块都可用**

---

## 受影响的 API 路由

以下 API 路由使用 Edge Runtime，已按照上述方法修复：

- `app/api/upload/route.ts` - 文件上传
- `app/api/notifications/route.ts` - 通知系统
- `app/api/messages/*/route.ts` - 私信系统
- `app/api/admin/*/route.ts` - 管理后台
- `app/api/storage-requests/*/route.ts` - 存储空间管理
- `app/api/drive/*/route.ts` - 云盘功能
- 以及其他所有标记了 `export const runtime = 'edge'` 的路由

---

## 故障排查

### 如果遇到 "xxx is not available in Edge Runtime" 错误

1. 检查是否使用了 Node.js 特定 API
2. 查找替代的 Web API
3. 如果必须使用 Node.js API，考虑移除 `export const runtime = 'edge'`

### 如果 Supabase 客户端初始化失败

1. 确保使用 `getSupabaseAdmin()` 而不是直接导入
2. 检查环境变量是否正确配置
3. 查看 `lib/supabaseAdmin.ts` 中的实现

### 如果文件操作失败

1. 确保使用 Supabase Storage API 而不是文件系统
2. 检查存储桶权限配置
3. 验证 RLS 策略是否正确

---

## 相关文件

- `lib/supabaseAdmin.ts` - Edge Runtime 兼容的 Supabase 客户端
- `lib/supabase.ts` - 客户端 Supabase 配置（用于浏览器）
- `app/api/*/route.ts` - 所有 API 路由实现

---

**最后更新：** 2025-11-03
**维护者：** 开发团队



