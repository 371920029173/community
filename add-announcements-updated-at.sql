-- 为 announcements 表添加 updated_at 列
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 为已有数据设置 updated_at
UPDATE announcements SET updated_at = created_at WHERE updated_at IS NULL;
