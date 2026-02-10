-- 礼品卷每月1号自动归档（使用 pg_cron）
-- 需在 Supabase Dashboard 中启用 pg_cron 扩展后执行

-- 1. 启用 pg_cron 扩展（如已启用可跳过）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 创建归档函数
CREATE OR REPLACE FUNCTION gift_voucher_monthly_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_month_str TEXT;
  cutoff_str TEXT;
BEGIN
  -- 上月月份，如 2026-02-01 运行时 => 2026-01
  last_month_str := to_char(
    date_trunc('month', CURRENT_DATE - INTERVAL '1 month'),
    'YYYY-MM'
  );
  
  -- 归档：将有礼品卷的用户写入 history
  INSERT INTO gift_voucher_history (user_id, username, vouchers_count, month)
  SELECT id, username, gift_vouchers, last_month_str
  FROM users
  WHERE gift_vouchers > 0
  ON CONFLICT (user_id, month) DO UPDATE SET
    vouchers_count = EXCLUDED.vouchers_count;
  
  -- 清零当月礼品卷
  UPDATE users SET gift_vouchers = 0 WHERE gift_vouchers > 0;
  
  -- 删除超过3个月的记录
  cutoff_str := to_char(
    date_trunc('month', CURRENT_DATE - INTERVAL '3 months'),
    'YYYY-MM'
  );
  DELETE FROM gift_voucher_history WHERE month < cutoff_str;
END;
$$;

-- 3. 每月1号 02:00 UTC 执行
SELECT cron.schedule(
  'gift-voucher-monthly-reset',
  '0 2 1 * *',
  $$SELECT gift_voucher_monthly_reset()$$
);
