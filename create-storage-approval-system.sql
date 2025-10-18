-- 创建存储空间修改审核表
CREATE TABLE IF NOT EXISTS storage_modification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_limit BIGINT NOT NULL,
  new_limit BIGINT NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_storage_requests_requester ON storage_modification_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_storage_requests_target ON storage_modification_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_storage_requests_status ON storage_modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_storage_requests_created_at ON storage_modification_requests(created_at);


