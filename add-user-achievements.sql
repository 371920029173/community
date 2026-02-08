-- 成就系统：俄罗斯轮盘等游戏的成就
-- 每个成就每人只能领取一次

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(64) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

COMMENT ON TABLE user_achievements IS '用户已领取的成就，每个成就每人限领一次';
