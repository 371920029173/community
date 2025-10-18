-- 第三步：设置默认存储限制为30GB
-- 30GB = 30 * 1024 * 1024 * 1024 = 32,212,254,720 字节
UPDATE users 
SET storage_limit = 32212254720 
WHERE storage_limit = 0;


