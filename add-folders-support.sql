-- 文件夹支持：云盘、文件分享
-- 支持上传整个文件夹，点击文件夹显示内部结构

-- 1. 云盘文件夹表
CREATE TABLE IF NOT EXISTS drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES drive_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drive_folders_user ON drive_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_parent ON drive_folders(parent_id);

-- 2. drive_files 添加 folder_id
ALTER TABLE drive_files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES drive_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_drive_files_folder ON drive_files(folder_id);

-- 3. 文件分享文件夹表（公开分享用）
CREATE TABLE IF NOT EXISTS share_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES share_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_share_folders_user ON share_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_share_folders_parent ON share_folders(parent_id);

-- 4. files 表添加 folder_id
ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES share_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);

-- 5. RLS for drive_folders
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own drive_folders" ON drive_folders;
CREATE POLICY "Users can manage own drive_folders" ON drive_folders
  FOR ALL USING (auth.uid() = user_id);

-- 6. RLS for share_folders
ALTER TABLE share_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own share_folders" ON share_folders;
CREATE POLICY "Users can manage own share_folders" ON share_folders
  FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anyone can view approved public share_folders" ON share_folders;
CREATE POLICY "Anyone can view approved public share_folders" ON share_folders
  FOR SELECT USING (is_public = true AND is_approved = true);

-- 7. 消息表添加 folder_id（聊天中发送文件夹）
ALTER TABLE messages ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES share_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_folder ON messages(folder_id);
