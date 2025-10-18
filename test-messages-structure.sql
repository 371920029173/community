-- 测试消息保存和检索
-- 在Supabase SQL编辑器中运行

-- 1. 检查消息表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 2. 检查对话表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- 3. 查看最近的消息（如果有的话）
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.message_type,
    m.sent_at,
    m.created_at,
    m.file_url,
    m.file_name
FROM messages m
ORDER BY m.sent_at DESC
LIMIT 10;

-- 4. 查看对话列表
SELECT 
    c.id,
    c.user1_id,
    c.user2_id,
    c.title,
    c.last_message_at,
    c.created_at
FROM conversations c
ORDER BY c.last_message_at DESC
LIMIT 10;

-- 5. 检查RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('messages', 'conversations')
ORDER BY tablename, policyname;

