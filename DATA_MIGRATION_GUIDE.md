# 网站数据迁移指南

## 概述
本指南说明如何将网站的所有数据（用户、文件、论坛、沙币等）从一个 Supabase 项目迁移到另一个 Supabase 项目。

## 迁移步骤

### 1. 准备工作

**在新 Supabase 项目中：**
1. 创建新的 Supabase 项目
2. 记录新的项目 URL 和 API 密钥
3. 确保新项目有足够的存储空间

### 2. 数据库迁移

#### 方法一：使用 Supabase Dashboard（推荐）

1. **导出旧项目数据：**
   - 登录旧 Supabase 项目
   - 进入 Database → Backups
   - 创建数据库备份（或使用自动备份）

2. **导入到新项目：**
   - 登录新 Supabase 项目
   - 进入 Database → Backups
   - 上传备份文件并恢复

#### 方法二：使用 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 从旧项目导出
supabase db dump --project-id <old-project-id> > backup.sql

# 导入到新项目
supabase db reset --project-id <new-project-id> < backup.sql
```

#### 方法三：使用 SQL 脚本

1. **导出所有表数据：**
   ```sql
   -- 在旧项目中执行
   COPY users TO STDOUT WITH CSV HEADER;
   COPY files TO STDOUT WITH CSV HEADER;
   COPY forums TO STDOUT WITH CSV HEADER;
   -- ... 其他表
   ```

2. **导入到新项目：**
   - 先执行 `create-forum-system.sql` 创建表结构
   - 然后导入 CSV 数据

### 3. 文件存储迁移（Supabase Storage）

#### 使用 Supabase CLI（推荐）

```bash
# 列出所有存储桶
supabase storage list --project-id <old-project-id>

# 下载存储桶数据
supabase storage download <bucket-name> --project-id <old-project-id> --output ./storage-backup

# 上传到新项目
supabase storage upload <bucket-name> --project-id <new-project-id> ./storage-backup
```

#### 使用 API 脚本

创建一个 Node.js 脚本：

```javascript
const { createClient } = require('@supabase/supabase-js')

const oldSupabase = createClient('OLD_URL', 'OLD_SERVICE_KEY')
const newSupabase = createClient('NEW_URL', 'NEW_SERVICE_KEY')

async function migrateStorage(bucketName) {
  // 列出所有文件
  const { data: files } = await oldSupabase.storage.from(bucketName).list()
  
  for (const file of files) {
    // 下载文件
    const { data: fileData } = await oldSupabase.storage
      .from(bucketName)
      .download(file.name)
    
    // 上传到新项目
    await newSupabase.storage
      .from(bucketName)
      .upload(file.name, fileData, {
        contentType: file.metadata?.mimetype,
        upsert: true
      })
  }
}

// 迁移所有存储桶
migrateStorage('avatars')
migrateStorage('files')
migrateStorage('drive-files')
```

### 4. 更新环境变量

在新部署平台更新以下环境变量：
- `NEXT_PUBLIC_SUPABASE_URL` → 新项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → 新项目匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` → 新项目服务角色密钥

### 5. 验证迁移

检查以下内容：
- [ ] 用户数据完整
- [ ] 文件可以正常访问
- [ ] 论坛数据完整
- [ ] 沙币数量正确
- [ ] 存储文件可以下载
- [ ] 用户认证正常

## 注意事项

1. **RLS 策略**：迁移后需要重新设置 RLS 策略（执行 `create-forum-system.sql` 中的策略部分）

2. **外键约束**：确保迁移顺序正确（先迁移 users，再迁移其他依赖表）

3. **UUID 一致性**：如果使用 UUID，确保新旧项目的 UUID 生成器一致

4. **时间戳**：迁移后时间戳会保持原样，但时区可能需要调整

5. **存储桶权限**：迁移后需要重新设置存储桶的公共访问权限

## 快速迁移脚本

可以创建一个完整的迁移脚本，自动化以上步骤。需要的话我可以帮您创建。

## 回滚方案

如果迁移出现问题：
1. 保留旧项目数据（不要删除）
2. 恢复 DNS 指向旧项目
3. 使用旧环境变量
4. 从备份恢复数据（如果有）

