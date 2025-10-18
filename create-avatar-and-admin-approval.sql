-- Avatar change requests table
create table if not exists public.avatar_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  new_avatar_url text not null,
  status text not null default 'pending', -- pending | approved | rejected
  reviewer_id uuid references public.users(id),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Admin change requests (normal admin changing other admin)
create table if not exists public.admin_change_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  action text not null, -- promote | demote
  status text not null default 'pending', -- pending | approved | rejected
  super_admin_id uuid references public.users(id),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- RLS policies (simplified)
alter table public.avatar_change_requests enable row level security;
alter table public.admin_change_requests enable row level security;

-- Users can create their own avatar requests
drop policy if exists "avatar_req_insert" on public.avatar_change_requests;
create policy "avatar_req_insert" on public.avatar_change_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can view their own avatar requests; moderators/admins can view all
drop policy if exists "avatar_req_select" on public.avatar_change_requests;
create policy "avatar_req_select" on public.avatar_change_requests
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() in (select id from public.users where is_admin = true or is_moderator = true));

-- Moderators/Admins can update (approve/reject)
drop policy if exists "avatar_req_update" on public.avatar_change_requests;
create policy "avatar_req_update" on public.avatar_change_requests
  for update to authenticated
  using (auth.uid() in (select id from public.users where is_admin = true or is_moderator = true));

-- Admin change requests policies
drop policy if exists "admin_change_insert" on public.admin_change_requests;
create policy "admin_change_insert" on public.admin_change_requests
  for insert to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "admin_change_select" on public.admin_change_requests;
create policy "admin_change_select" on public.admin_change_requests
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() in (select id from public.users where is_admin = true));

drop policy if exists "admin_change_update" on public.admin_change_requests;
create policy "admin_change_update" on public.admin_change_requests
  for update to authenticated
  using (auth.uid() in (select id from public.users where username = '371920029173')); -- super admin only



