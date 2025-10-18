-- 扩展消息表中文件相关字段的长度，增强文件类型包容性
ALTER TABLE messages 
ALTER COLUMN file_name TYPE TEXT,
ALTER COLUMN file_type TYPE TEXT,
ALTER COLUMN mime_type TYPE TEXT;

-- 扩展文件表中相关字段的长度
ALTER TABLE files 
ALTER COLUMN original_name TYPE TEXT,
ALTER COLUMN file_type TYPE TEXT,
ALTER COLUMN mime_type TYPE TEXT;

-- 扩展云盘文件表中相关字段的长度
ALTER TABLE drive_files 
ALTER COLUMN original_name TYPE TEXT,
ALTER COLUMN file_type TYPE TEXT,
ALTER COLUMN mime_type TYPE TEXT;


