# 幽灵账号自动清理功能

## 功能说明

此功能用于自动清理"幽灵账号"：在 Supabase Auth (`auth.users`) 中不存在，但在 `public.users` 表中仍有记录的用户。这些账号会占用用户名，导致新用户无法注册。

## 实现方式

### 1. API 端点

创建了清理 API：`/api/admin/cleanup-ghost-accounts`

**请求方式：**
- GET: `https://你的域名/api/admin/cleanup-ghost-accounts?secret=<YOUR_SECRET>`
- POST: 请求体中包含 `{ "secret": "<YOUR_SECRET>" }`

**安全验证：**
- 必须提供 `secret` 参数进行验证
- 默认 secret: `cleanup_ghost_accounts_2024`
- 可通过环境变量 `ADMIN_CLEANUP_SECRET` 覆盖

### 2. 工作原理

1. **获取所有用户**：从 `public.users` 表读取所有用户 ID
2. **检查 Auth 存在性**：对每个用户调用 `supabase.auth.admin.getUserById()` 检查是否在 `auth.users` 中存在
3. **删除幽灵账号**：删除在 Auth 中不存在的用户的 `public.users` 记录
4. **返回统计信息**：返回清理结果和统计信息

### 3. 配置定时任务（每小时执行）

#### 方案 A：使用 cron-job.org（推荐，免费）

1. 访问 [https://cron-job.org](https://cron-job.org)
2. 注册/登录账号
3. 点击 "Create cronjob"
4. 配置如下：
   - **Title**: `清理幽灵账号`
   - **Address**: `https://你的域名/api/admin/cleanup-ghost-accounts?secret=你的密钥`
   - **Schedule**: 选择 "Every hour" 或自定义 `0 * * * *`（每小时的第0分钟）
   - **Request method**: `GET`
   - **Activated**: 勾选
5. 点击 "Create cronjob" 保存

#### 方案 B：使用 EasyCron

1. 访问 [https://www.easycron.com](https://www.easycron.com)
2. 注册/登录
3. 创建新的 Cron Job
4. 配置：
   - **Cron Job Name**: `清理幽灵账号`
   - **URL**: `https://你的域名/api/admin/cleanup-ghost-accounts?secret=你的密钥`
   - **Schedule Pattern**: `0 * * * *`（每小时）
   - **HTTP Method**: `GET`
5. 保存并启用

#### 方案 C：使用 Cloudflare Workers Cron Triggers

如果部署在 Cloudflare Pages，可以使用 Workers 的 Cron Triggers：

1. 创建 `wrangler.toml` 中的 cron 配置（需要 Workers 计划）
2. 创建 Worker 定期调用清理 API

### 4. 环境变量配置（可选）

在 Cloudflare Pages 环境变量或 `wrangler.toml` 中添加：

```toml
[vars]
ADMIN_CLEANUP_SECRET = "your_custom_secret_key_here"
```

**安全建议：**
- 使用强随机字符串作为 secret
- 不要将 secret 提交到代码仓库
- 定期更换 secret

### 5. 手动测试

在浏览器或使用 curl 测试：

```bash
# 使用默认 secret
curl "https://你的域名/api/admin/cleanup-ghost-accounts?secret=cleanup_ghost_accounts_2024"

# 使用自定义 secret（如果配置了环境变量）
curl "https://你的域名/api/admin/cleanup-ghost-accounts?secret=your_custom_secret"
```

**预期响应：**
```json
{
  "success": true,
  "message": "清理完成：发现 X 个幽灵账号，已删除 Y 个",
  "stats": {
    "totalUsers": 100,
    "validUsers": 98,
    "ghostAccountsFound": 2,
    "deletedAccounts": 2,
    "failedDeletions": 0,
    "deletedUsers": [
      {
        "id": "user-id-1",
        "username": "ghost_user_1",
        "email": "user1@example.com"
      }
    ],
    "timestamp": "2024-11-01T00:00:00.000Z"
  }
}
```

### 6. 监控和日志

- 清理操作会记录到 Cloudflare Pages 日志
- 定时任务服务通常会提供执行日志
- 建议定期检查定时任务执行状态

## 注意事项

1. **不要删除有效账号**：代码会保守处理，只有确认不在 Auth 中的账号才会被删除
2. **超级管理员保护**：不会删除用户名 `371920029173` 的账号（即使不存在）
3. **失败处理**：如果删除某个账号失败，会记录错误但不会中断整个过程
4. **执行频率**：建议每小时执行一次，太频繁可能影响性能
5. **Secret 安全**：务必使用强密钥，不要泄露

## 故障排查

### 问题：返回 401 未授权
- **原因**：secret 参数不正确
- **解决**：检查 URL 中的 secret 参数或环境变量配置

### 问题：返回 500 错误
- **原因**：Supabase 连接失败或权限不足
- **解决**：
  1. 检查 `SUPABASE_SERVICE_ROLE_KEY` 环境变量是否正确
  2. 确认 Service Role Key 有管理员权限

### 问题：定时任务不执行
- **原因**：定时任务服务配置错误或服务未激活
- **解决**：
  1. 检查 cron-job.org 或 EasyCron 中的任务状态
  2. 查看执行日志，确认 URL 和 secret 正确
  3. 手动测试 API 端点是否可访问

## 技术细节

- **运行时**：Edge Runtime（Cloudflare Pages 兼容）
- **数据库操作**：使用 Service Role Key 绕过 RLS
- **API 认证**：通过 secret 参数验证（不是用户身份认证）
- **错误处理**：保守策略，失败时不会删除账号

