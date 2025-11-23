# 项目迁移部署指南

## 概述
本指南说明如何将项目从一个部署环境迁移到另一个部署环境（例如从 Cloudflare Pages 迁移到其他平台）。

## 迁移步骤

### 1. 代码迁移
代码已经托管在 GitHub，迁移代码很简单：

```bash
# 在新服务器/平台克隆代码
git clone https://github.com/371920029173/community.git
cd community
git checkout cf-pages  # 或使用主分支
```

### 2. 环境变量迁移
需要迁移以下环境变量到新平台：

**必需的环境变量：**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（敏感）

**可选的环境变量：**
- `NEXT_PUBLIC_APP_NAME` - 应用名称
- `NEXT_PUBLIC_APP_VERSION` - 应用版本
- `NEXT_PUBLIC_APP_URL` - 应用 URL
- `NEXT_PUBLIC_SITE_URL` - 站点 URL
- `JWT_SECRET` - JWT 密钥
- `ENCRYPTION_KEY` - 加密密钥
- `SESSION_SECRET` - 会话密钥
- `CSRF_SECRET` - CSRF 密钥

### 3. 数据库迁移（Supabase）
**Supabase 数据库不需要迁移**，因为：
- 数据库托管在 Supabase 云端
- 只要环境变量中的 Supabase URL 和密钥不变，数据库连接就会保持不变
- 所有数据（用户、文件、论坛、沙币等）都存储在 Supabase 数据库中

**如果需要迁移 Supabase 项目：**
1. 在 Supabase 控制台导出数据库备份
2. 在新 Supabase 项目中导入备份
3. 更新环境变量中的 `NEXT_PUBLIC_SUPABASE_URL` 和密钥

### 4. 文件存储迁移（Supabase Storage）
如果使用 Supabase Storage 存储文件：

**文件迁移方法：**
1. **使用 Supabase CLI（推荐）：**
   ```bash
   # 安装 Supabase CLI
   npm install -g supabase
   
   # 登录 Supabase
   supabase login
   
   # 导出存储桶数据
   supabase storage download <bucket-name> --project-id <old-project-id>
   
   # 导入到新项目
   supabase storage upload <bucket-name> --project-id <new-project-id>
   ```

2. **使用 Supabase Dashboard：**
   - 在旧项目的 Storage 页面下载文件
   - 在新项目的 Storage 页面上传文件

3. **使用 API 脚本：**
   ```typescript
   // 列出所有文件
   const { data: files } = await supabase.storage.from('bucket-name').list()
   
   // 下载并上传到新项目
   for (const file of files) {
     const { data: downloadData } = await oldSupabase.storage
       .from('bucket-name')
       .download(file.name)
     
     await newSupabase.storage
       .from('bucket-name')
       .upload(file.name, downloadData)
   }
   ```

### 5. 部署平台迁移

#### Cloudflare Pages → Vercel
1. 在 Vercel 导入 GitHub 仓库
2. 设置环境变量
3. 构建命令：`npm run build`
4. 输出目录：`.vercel/output/static`（如果使用 Cloudflare adapter）

#### Cloudflare Pages → Netlify
1. 在 Netlify 导入 GitHub 仓库
2. 设置环境变量
3. 构建命令：`npm run build`
4. 发布目录：`.vercel/output/static` 或 `.next`

#### Cloudflare Pages → 自托管服务器
1. 安装 Node.js 18+ 和 npm
2. 克隆代码并安装依赖：`npm install`
3. 设置环境变量（使用 `.env.local` 文件）
4. 构建：`npm run build`
5. 启动：`npm start`（生产模式）或使用 PM2

### 6. 域名和 DNS 迁移
1. 更新 DNS 记录指向新服务器
2. 更新环境变量中的 `NEXT_PUBLIC_APP_URL` 和 `NEXT_PUBLIC_SITE_URL`
3. 等待 DNS 传播（通常 24-48 小时）

### 7. 验证迁移
迁移后验证以下功能：
- [ ] 用户登录/注册
- [ ] 文件上传/下载
- [ ] 论坛功能
- [ ] 沙币系统
- [ ] 管理员功能
- [ ] API 路由正常工作

## 快速迁移清单

- [ ] 克隆代码仓库
- [ ] 设置所有环境变量
- [ ] 安装依赖：`npm install`
- [ ] 运行数据库迁移（如果需要）：执行 `create-forum-system.sql`
- [ ] 迁移文件存储（如果需要）
- [ ] 构建项目：`npm run build`
- [ ] 部署到新平台
- [ ] 更新 DNS 记录
- [ ] 测试所有功能

## 注意事项

1. **数据库连接**：确保新环境能访问 Supabase（网络防火墙设置）
2. **Edge Runtime**：所有 API 路由使用 Edge Runtime，确保新平台支持
3. **文件大小限制**：检查新平台的文件上传大小限制
4. **环境变量安全**：不要在代码中硬编码敏感信息
5. **备份**：迁移前备份数据库和文件

## 回滚方案

如果迁移出现问题，可以：
1. 恢复 DNS 记录指向旧服务器
2. 使用旧环境变量配置
3. 从 Supabase 备份恢复数据库（如果有）

## 联系支持

如有问题，请检查：
- Supabase 项目状态
- 环境变量配置
- 构建日志
- 浏览器控制台错误

