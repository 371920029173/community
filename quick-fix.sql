-- 简化版消息表修复脚本
-- 在Supabase SQL编辑器中运行

-- 1. 删除可能存在的旧策略
DROP POLICY IF EXISTS "用户可以查看自己的消息" ON public.messages;
DROP POLICY IF EXISTS "用户可以发送消息" ON public.messages;
DROP POLICY IF EXISTS "用户可以更新自己的消息" ON public.messages;

-- 2. 创建新的RLS策略
CREATE POLICY "用户可以查看自己的消息" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "用户可以发送消息" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "用户可以更新自己的消息" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- 3. 确保文件表的管理员更新策略
DROP POLICY IF EXISTS "管理员可以更新文件" ON public.files;

CREATE POLICY "管理员可以更新文件" ON public.files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.is_admin = true OR users.is_moderator = true)
        )
    );

