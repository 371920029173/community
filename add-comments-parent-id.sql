-- 为 comments 表添加 parent_id 以支持回复
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

COMMENT ON COLUMN comments.parent_id IS '回复的父评论ID，为空表示顶级评论';
