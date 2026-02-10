-- 按用户单独控制礼品卷开放（替代全局开关）
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_vouchers_allowed BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN users.gift_vouchers_allowed IS '该用户是否可访问礼品卷页面，由超级管理员在后台设置';
