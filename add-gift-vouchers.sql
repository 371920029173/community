-- 礼品卷系统
-- 50沙币 或 40铒币 = 1礼品卷，每月1号清零

-- 用户礼品卷（当月）
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_vouchers INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN users.gift_vouchers IS '礼品卷数量，每月1号清零。50沙币或40铒币兑换1个';

-- 站点设置（礼品卷功能是否开放）
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE site_settings IS '站点配置，如礼品卷功能开关';

-- 礼品卷历史（按月归档，保留近三月）
CREATE TABLE IF NOT EXISTS gift_voucher_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  vouchers_count INTEGER NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);
CREATE INDEX IF NOT EXISTS idx_gift_voucher_history_month ON gift_voucher_history(month DESC);
COMMENT ON TABLE gift_voucher_history IS '礼品卷月度记录，保留近三月';

-- 初始化礼品卷开关为关闭
INSERT INTO site_settings (key, value) VALUES ('gift_vouchers_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
