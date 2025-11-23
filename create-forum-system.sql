-- 论坛系统和沙币系统数据库表结构

-- 1. 添加沙币字段到 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sand_coins INTEGER DEFAULT 0;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_sand_coins ON users(sand_coins);

-- 2. 创建广告点击记录表（用于防止重复奖励）
CREATE TABLE IF NOT EXISTS ad_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ad_position VARCHAR(50) NOT NULL, -- 'top', 'sidebar', 'bottom'
    click_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    click_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 日期字段，用于唯一性检查
    is_valid BOOLEAN DEFAULT TRUE, -- 是否为有效点击
    coins_awarded INTEGER DEFAULT 0, -- 奖励的币数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_ad_clicks_user_date ON ad_clicks(user_id, click_date);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_timestamp ON ad_clicks(click_timestamp);

-- 创建唯一索引：确保每天每个位置只能奖励一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_clicks_unique_daily 
ON ad_clicks(user_id, ad_position, click_date);

-- 3. 创建论坛表
CREATE TABLE IF NOT EXISTS forums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    current_topic TEXT, -- 当前讨论内容
    announcement TEXT, -- 论坛公告
    is_hidden BOOLEAN DEFAULT FALSE, -- 是否隐藏
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 过期时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_forums_owner ON forums(owner_id);
CREATE INDEX IF NOT EXISTS idx_forums_hidden ON forums(is_hidden);
CREATE INDEX IF NOT EXISTS idx_forums_expires ON forums(expires_at);
CREATE INDEX IF NOT EXISTS idx_forums_created ON forums(created_at);

-- 4. 创建论坛成员表（论坛类似于群，用户需要加入才能参与）
CREATE TABLE IF NOT EXISTS forum_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(forum_id, user_id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_forum_members_forum ON forum_members(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_members_user ON forum_members(user_id);

-- 5. 创建论坛消息表（论坛内的讨论消息）
CREATE TABLE IF NOT EXISTS forum_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file'
    file_id UUID REFERENCES files(id) ON DELETE SET NULL, -- 如果是文件消息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_forum_messages_forum ON forum_messages(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_sender ON forum_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_created ON forum_messages(created_at);

-- 6. 创建论坛操作记录表（用于记录创建、修改、续费等操作）
CREATE TABLE IF NOT EXISTS forum_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'renew', 'hide', 'delete'
    coins_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_forum_operations_forum ON forum_operations(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_operations_user ON forum_operations(user_id);

-- 7. 创建用户记事本表
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- 每个用户只有一个记事本
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id);

-- 8. 创建论坛到期提醒表（用于记录已发送的提醒）
CREATE TABLE IF NOT EXISTS forum_expiry_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    days_until_expiry INTEGER, -- 距离过期的天数
    UNIQUE(forum_id, days_until_expiry) -- 每个论坛每种提醒只发送一次
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_forum_expiry_reminders_forum ON forum_expiry_reminders(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_expiry_reminders_user ON forum_expiry_reminders(user_id);

-- 9. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为论坛表添加更新时间触发器
DROP TRIGGER IF EXISTS update_forums_updated_at ON forums;
CREATE TRIGGER update_forums_updated_at BEFORE UPDATE ON forums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为论坛消息表添加更新时间触发器
DROP TRIGGER IF EXISTS update_forum_messages_updated_at ON forum_messages;
CREATE TRIGGER update_forum_messages_updated_at BEFORE UPDATE ON forum_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 启用行级安全（RLS）
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_expiry_reminders ENABLE ROW LEVEL SECURITY;

-- 11. 创建RLS策略

-- ad_clicks: 用户只能查看自己的点击记录
DROP POLICY IF EXISTS "Users can view own ad clicks" ON ad_clicks;
CREATE POLICY "Users can view own ad clicks" ON ad_clicks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ad clicks" ON ad_clicks;
CREATE POLICY "Users can insert own ad clicks" ON ad_clicks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- forums: 所有人可以查看未隐藏的论坛，所有者可以查看和管理自己的论坛
DROP POLICY IF EXISTS "Anyone can view visible forums" ON forums;
CREATE POLICY "Anyone can view visible forums" ON forums
    FOR SELECT USING (is_hidden = FALSE OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create own forums" ON forums;
CREATE POLICY "Users can create own forums" ON forums
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own forums" ON forums;
CREATE POLICY "Owners can update own forums" ON forums
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own forums" ON forums;
CREATE POLICY "Owners can delete own forums" ON forums
    FOR DELETE USING (auth.uid() = owner_id);

-- forum_members: 用户可以查看自己加入的论坛成员列表
DROP POLICY IF EXISTS "Users can view forum members" ON forum_members;
CREATE POLICY "Users can view forum members" ON forum_members
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM forums WHERE forums.id = forum_members.forum_id AND forums.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can join forums" ON forum_members;
CREATE POLICY "Users can join forums" ON forum_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave forums" ON forum_members;
CREATE POLICY "Users can leave forums" ON forum_members
    FOR DELETE USING (auth.uid() = user_id);

-- forum_messages: 论坛成员可以查看和发送消息
DROP POLICY IF EXISTS "Forum members can view messages" ON forum_messages;
CREATE POLICY "Forum members can view messages" ON forum_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM forum_members WHERE forum_members.forum_id = forum_messages.forum_id AND forum_members.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM forums WHERE forums.id = forum_messages.forum_id AND forums.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Forum members can send messages" ON forum_messages;
CREATE POLICY "Forum members can send messages" ON forum_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (SELECT 1 FROM forum_members WHERE forum_members.forum_id = forum_messages.forum_id AND forum_members.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Senders can update own messages" ON forum_messages;
CREATE POLICY "Senders can update own messages" ON forum_messages
    FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Senders can delete own messages" ON forum_messages;
CREATE POLICY "Senders can delete own messages" ON forum_messages
    FOR DELETE USING (auth.uid() = sender_id);

-- forum_operations: 用户可以查看自己的操作记录
DROP POLICY IF EXISTS "Users can view own operations" ON forum_operations;
CREATE POLICY "Users can view own operations" ON forum_operations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert operations" ON forum_operations;
CREATE POLICY "System can insert operations" ON forum_operations
    FOR INSERT WITH CHECK (true); -- 由服务端API控制

-- user_notes: 用户只能访问自己的记事本
DROP POLICY IF EXISTS "Users can manage own notes" ON user_notes;
CREATE POLICY "Users can manage own notes" ON user_notes
    FOR ALL USING (auth.uid() = user_id);

-- forum_expiry_reminders: 用户可以查看自己的提醒
DROP POLICY IF EXISTS "Users can view own reminders" ON forum_expiry_reminders;
CREATE POLICY "Users can view own reminders" ON forum_expiry_reminders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert reminders" ON forum_expiry_reminders;
CREATE POLICY "System can insert reminders" ON forum_expiry_reminders
    FOR INSERT WITH CHECK (true); -- 由服务端API控制

-- 添加注释
COMMENT ON COLUMN users.sand_coins IS '沙币数量，用户通过广告点击获得，用于创建和管理论坛';
COMMENT ON TABLE forums IS '论坛表，每个用户最多创建10个论坛';
COMMENT ON COLUMN forums.expires_at IS '论坛过期时间，默认60天，可通过续费延长30天';
COMMENT ON TABLE forum_members IS '论坛成员表，用户需要加入论坛才能参与讨论';
COMMENT ON TABLE forum_messages IS '论坛消息表，存储论坛内的讨论内容';
COMMENT ON TABLE user_notes IS '用户记事本，每个用户只有一个，自动保存';

