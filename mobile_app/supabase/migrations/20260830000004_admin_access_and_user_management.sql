-- Pawi Financial Tracker — Admin Access Control & User Management Migration
-- Single-account access locked strictly to janvermanlapaz@gmail.com

-- 1. Extend profiles table with Admin & Suspension Columns
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_reason text,
  add column if not exists suspended_at timestamp with time zone,
  add column if not exists last_seen_at timestamp with time zone default timezone('utc'::text, now());

-- 2. Dedicated admin_users table for bulletproof server-side permission checks
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  granted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on admin_users
alter table public.admin_users enable row level security;

-- Only authorized admins can read the admin_users table (or service role)
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Admins can view admin_users" on public.admin_users
  for select using (auth.uid() = user_id);

-- 3. Database function to check if a user is an authorized admin
create or replace function public.is_admin(check_user_id uuid)
returns boolean as $$
declare
  is_admin_user boolean;
begin
  select exists (
    select 1 from public.admin_users where user_id = check_user_id
  ) into is_admin_user;
  return is_admin_user;
end;
$$ language plpgsql security definer;

-- 4. Seed janvermanlapaz@gmail.com into admin_users and update profile
do $$
declare
  target_user_id uuid;
begin
  -- Find the user ID from auth.users if they already exist
  select id into target_user_id from auth.users where email = 'janvermanlapaz@gmail.com' limit 1;
  
  if target_user_id is not null then
    -- Insert into admin_users
    insert into public.admin_users (user_id, email)
    values (target_user_id, 'janvermanlapaz@gmail.com')
    on conflict (user_id) do update set email = 'janvermanlapaz@gmail.com';

    -- Set is_admin flag on profiles
    update public.profiles
    set is_admin = true
    where id = target_user_id;
  end if;
end $$;

-- 5. Trigger to automatically grant admin rights to janvermanlapaz@gmail.com if they sign up later
create or replace function public.handle_admin_assignment()
returns trigger as $$
begin
  if new.email = 'janvermanlapaz@gmail.com' then
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;

    update public.profiles
    set is_admin = true
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_admin_check on auth.users;
create trigger on_auth_admin_check
  after insert or update on auth.users
  for each row execute function public.handle_admin_assignment();

-- 6. Ensure admin_settings table exists and is fully provisioned
create table if not exists public.admin_settings (
  id text primary key default 'global',
  budget_alert_threshold integer default 80,
  enable_ai_receipt_parser boolean default true,
  weekly_digest_email boolean default true,
  require_2fa boolean default false,
  auto_sync_exchange boolean default true,
  maintenance_mode boolean default false,
  announcement_banner text,
  announcement_active boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default admin settings if not present
insert into public.admin_settings (
  id,
  budget_alert_threshold,
  enable_ai_receipt_parser,
  weekly_digest_email,
  maintenance_mode,
  announcement_active
)
values ('global', 80, true, true, false, false)
on conflict (id) do nothing;

-- 7. Ensure activity_log has indexes for fast dashboard metric queries
create index if not exists idx_activity_log_event_time on public.activity_log (event_type, created_at desc);
create index if not exists idx_activity_log_user on public.activity_log (related_user_id, created_at desc);
create index if not exists idx_profiles_is_admin on public.profiles (is_admin);
create index if not exists idx_profiles_is_suspended on public.profiles (is_suspended);
