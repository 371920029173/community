-- 铒币（游戏币）系统
-- 5 沙币 = 1 铒币，每次游戏消耗 1 铒币，达成目标返还 2 铒币

ALTER TABLE users ADD COLUMN IF NOT EXISTS game_coins INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.game_coins IS '铒币数量，用于小游戏。5沙币兑换1铒币，每次游戏消耗1铒币，达成目标返还2铒币';
