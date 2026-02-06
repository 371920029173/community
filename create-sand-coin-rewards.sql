-- 沙币新规则：每日登录、停留、邀请奖励

-- 1. users 表新增字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_rewarded_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);

-- 2. 每日奖励记录表（登录10币、停留10分钟10币）
CREATE TABLE IF NOT EXISTS user_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL,
    login_coins_given BOOLEAN DEFAULT FALSE,
    stay_coins_given BOOLEAN DEFAULT FALSE,
    total_stay_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reward_date)
);
CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_date ON user_daily_rewards(user_id, reward_date);

-- 3. 邀请记录表（防刷：记录已奖励的邀请对）
CREATE TABLE IF NOT EXISTS invite_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rewarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invitee_id)
);
CREATE INDEX IF NOT EXISTS idx_invite_rewards_inviter ON invite_rewards(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_rewards_invitee ON invite_rewards(invitee_id);
