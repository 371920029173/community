-- 第一步：创建存储管理日志表
CREATE TABLE IF NOT EXISTS storage_management_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL DEFAULT 'set_storage',
  old_limit BIGINT NOT NULL DEFAULT 0,
  new_limit BIGINT NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 第二步：创建索引
CREATE INDEX IF NOT EXISTS idx_storage_logs_admin_id ON storage_management_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_storage_logs_target_user_id ON storage_management_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_storage_logs_created_at ON storage_management_logs(created_at);


