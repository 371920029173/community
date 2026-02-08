-- 为 files 表添加 author_name 和 description 列
-- 用于文件卡片展示作者和描述

ALTER TABLE files ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS description TEXT;

-- 为已有数据补充作者名称（从 public.users 获取，该表有 username）
UPDATE files f
SET author_name = COALESCE(u.nickname, u.username, '未知用户')
FROM public.users u
WHERE f.user_id = u.id
  AND (f.author_name IS NULL OR f.author_name = '');

COMMENT ON COLUMN files.author_name IS '作者名称';
COMMENT ON COLUMN files.description IS '文件描述';
