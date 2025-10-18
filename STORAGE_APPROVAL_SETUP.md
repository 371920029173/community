# 存储空间修改审核系统设置指南

## 问题描述
当普通管理员尝试修改他人存储空间时，出现错误：
```
Could not find the table 'public.storage_modification_requests' in the schema cache
```

## 解决方案

### 步骤1：在Supabase中执行SQL脚本

1. 登录到你的Supabase项目控制台
2. 进入 **SQL Editor** 页面
3. 复制并执行 `create-storage-approval-simple.sql` 文件中的SQL代码

### 步骤2：验证表创建成功

执行以下SQL查询来验证表是否创建成功：
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'storage_modification_requests';
```

### 步骤3：测试功能

1. 使用普通管理员账号登录
2. 进入存储管理页面
3. 尝试修改其他用户的存储空间
4. 应该会看到"存储空间修改请求已提交，等待超级管理员审核"的提示

## 功能说明

### 普通管理员
- 修改他人存储空间需要提交审核请求
- 可以在审核请求列表中查看自己的申请状态

### 超级管理员 (371920029173)
- 可以直接修改存储空间（无需审核）
- 可以审核所有待处理的请求
- 点击"审核请求"按钮查看待审核请求

## 数据库表结构

`storage_modification_requests` 表包含以下字段：
- `id`: 请求ID (UUID)
- `requester_id`: 申请者ID
- `target_user_id`: 目标用户ID
- `old_limit`: 原存储限制
- `new_limit`: 新存储限制
- `reason`: 申请理由
- `status`: 状态 (pending/approved/rejected)
- `reviewed_by`: 审核者ID
- `reviewed_at`: 审核时间
- `review_comment`: 审核备注
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 故障排除

如果仍然遇到问题，请检查：
1. SQL脚本是否完全执行成功
2. 是否有权限错误
3. 表名是否正确拼写
4. 外键约束是否正确设置


