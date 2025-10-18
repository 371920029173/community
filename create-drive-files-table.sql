-- 创建云盘专用表：drive_files
-- 在 Supabase SQL 编辑器中执行本脚本

create extension if not exists "uuid-ossp";

create table if not exists public.drive_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  original_name text not null,
  filename text not null,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  file_type text not null,
  file_hash text,
  signed_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 基本索引
create index if not exists drive_files_user_id_idx on public.drive_files(user_id);
create index if not exists drive_files_created_at_idx on public.drive_files(created_at desc);

-- 说明：drive_files 为私密表，所有访问均走服务端（service role），无需RLS策略。




