-- 添加广告单元ID字段到ad_clicks表
-- 用于记录用户点击的具体广告单元，而不是位置

-- 添加ad_slot_id字段
ALTER TABLE ad_clicks 
ADD COLUMN IF NOT EXISTS ad_slot_id VARCHAR(50);

-- 为现有数据设置默认值（使用ad_position作为临时值）
UPDATE ad_clicks 
SET ad_slot_id = ad_position 
WHERE ad_slot_id IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_slot_id ON ad_clicks(ad_slot_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_user_slot_date ON ad_clicks(user_id, ad_slot_id, click_date);

-- 删除旧的唯一索引
DROP INDEX IF EXISTS idx_ad_clicks_unique_daily;

-- 创建新的唯一索引：确保每天每个广告单元只能奖励一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_clicks_unique_daily_slot 
ON ad_clicks(user_id, ad_slot_id, click_date);

-- 添加注释
COMMENT ON COLUMN ad_clicks.ad_slot_id IS '广告单元ID（AdSense广告单元ID），用于标识具体的广告';



