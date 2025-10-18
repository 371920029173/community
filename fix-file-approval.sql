-- 修复文件审核拒绝功能
-- 在Supabase SQL编辑器中运行

-- 1. 检查文件表的RLS策略
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
WHERE tablename = 'files'
ORDER BY policyname;

-- 2. 确保管理员可以更新文件状态
DROP POLICY IF EXISTS "管理员可以更新文件" ON public.files;
DROP POLICY IF EXISTS "用户可以更新自己的文件" ON public.files;

-- 创建新的文件更新策略
CREATE POLICY "管理员可以更新文件" ON public.files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.is_admin = true OR users.is_moderator = true)
        )
    );

CREATE POLICY "用户可以更新自己的文件" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. 确保文件表有正确的字段
DO $$ 
BEGIN
    -- 添加 user_id 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'user_id') THEN
        ALTER TABLE public.files ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. 验证策略
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
WHERE tablename = 'files'
ORDER BY policyname;

