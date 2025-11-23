-- 添加设备指纹字段到 users 表
-- 用于限制同一设备在24小时内注册的账号数量

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint_created_at 
ON users(device_fingerprint, created_at) 
WHERE device_fingerprint IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN users.device_fingerprint IS '设备指纹，用于限制同一设备在24小时内注册的账号数量（最多5个）';

