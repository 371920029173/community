-- 文件分享标签/类别系统
-- 在 Supabase SQL Editor 中运行

-- 1. 标签表（类别名唯一）
CREATE TABLE IF NOT EXISTS file_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(name);

-- 2. 文件-标签关联表（多对多）
CREATE TABLE IF NOT EXISTS file_tag_links (
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_file_tag_links_file ON file_tag_links(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_links_tag ON file_tag_links(tag_id);

-- 3. RLS
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tag_links ENABLE ROW LEVEL SECURITY;

-- 标签：所有人可读
DROP POLICY IF EXISTS "Anyone can read tags" ON file_tags;
CREATE POLICY "Anyone can read tags" ON file_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert tags" ON file_tags;
CREATE POLICY "Authenticated can insert tags" ON file_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 关联表：所有人可读，认证用户可插入
DROP POLICY IF EXISTS "Anyone can read file tag links" ON file_tag_links;
CREATE POLICY "Anyone can read file tag links" ON file_tag_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert file tag links" ON file_tag_links;
CREATE POLICY "Authenticated can insert file tag links" ON file_tag_links FOR INSERT WITH CHECK (auth.role() = 'authenticated');

SELECT 'File tags tables created successfully!' as status;
