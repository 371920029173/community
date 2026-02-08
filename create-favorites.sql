-- 文件收藏系统
-- 收藏夹表
CREATE TABLE IF NOT EXISTS favorite_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_collections_user ON favorite_collections(user_id);

-- 收藏项表（文件与收藏夹关联）
CREATE TABLE IF NOT EXISTS favorite_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES favorite_collections(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_items_collection ON favorite_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_favorite_items_user ON favorite_items(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_items_file ON favorite_items(file_id);

ALTER TABLE favorite_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own collections" ON favorite_collections;
CREATE POLICY "Users manage own collections" ON favorite_collections
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own favorite items" ON favorite_items;
CREATE POLICY "Users manage own favorite items" ON favorite_items
  FOR ALL USING (auth.uid() = user_id);
