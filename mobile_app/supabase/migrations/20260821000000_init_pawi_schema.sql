-- Pawi Financial Tracker — Supabase Schema Migration
-- Adapted for PostgreSQL + Row Level Security (RLS) + Storage + Auth Trigger

create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default 'Pawi User',
  initials text not null default 'PU',
  avatar_url text,
  currency text not null default 'PHP',
  monthly_income numeric(12, 2) default 0.00,
  monthly_budget_target numeric(12, 2) default 0.00,
  country text default 'PH',
  timezone text default 'Asia/Manila',
  is_student boolean default true,
  onboarding_completed boolean default false,
  notifications_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Accounts / Wallets Table
create table if not exists public.accounts (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default 'cash',
  balance numeric(12, 2) not null default 0.00,
  currency text not null default 'PHP',
  color integer not null default 1,
  icon text default 'wallet',
  is_archived boolean default false,
  is_liability boolean default false,
  credit_limit numeric(12, 2) default 0.00,
  used_credit numeric(12, 2) default 0.00,
  interest_rate text,
  due_day integer,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Categories / Budgets Table
create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default 'expense',
  color integer not null default 1,
  icon text default 'tag',
  monthly_limit numeric(12, 2) default 0.00,
  spent numeric(12, 2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Transactions Table
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id text references public.accounts(id) on delete set null,
  category_id text references public.categories(id) on delete set null,
  type text not null default 'expense',
  amount numeric(12, 2) not null,
  currency text not null default 'PHP',
  title text not null,
  merchant text,
  transaction_date date not null default current_date,
  transaction_time time without time zone default current_time,
  notes text,
  tags text[] default '{}',
  receipt_url text,
  confidence text default 'high',
  low_fields text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Recurring Bills / Planned Payments Table
create table if not exists public.recurring_bills (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id text references public.categories(id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null,
  billing_cycle text not null default 'monthly',
  due_day integer not null,
  next_due_date date not null,
  reminder_days_before integer not null default 3,
  enabled boolean default true,
  account_name text default 'Cash',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Savings Goals Table
create table if not exists public.savings_goals (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0.00,
  target_date date,
  color integer not null default 1,
  icon text default 'target',
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Push Subscriptions Table
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  device_label text default 'Web Browser',
  last_seen_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Activity Log Table
create table if not exists public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  event_type text not null,
  description text not null,
  related_user_id uuid references auth.users on delete set null,
  performed_by text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Admin Settings Table
create table if not exists public.admin_settings (
  id text primary key default 'global',
  budget_alert_threshold integer default 80,
  enable_ai_receipt_parser boolean default true,
  weekly_digest_email boolean default true,
  require_2fa boolean default false,
  auto_sync_exchange boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert Default Admin Settings if not exists
insert into public.admin_settings (id, budget_alert_threshold, enable_ai_receipt_parser, weekly_digest_email)
values ('global', 80, true, true)
on conflict (id) do nothing;

-- 10. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.savings_goals enable row level security;
alter table public.push_subscriptions enable row level security;

-- 11. Define RLS Policies
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users manage own accounts" on public.accounts for all using (auth.uid() = user_id);
create policy "Users manage own categories" on public.categories for all using (auth.uid() = user_id);
create policy "Users manage own transactions" on public.transactions for all using (auth.uid() = user_id);
create policy "Users manage own bills" on public.recurring_bills for all using (auth.uid() = user_id);
create policy "Users manage own goals" on public.savings_goals for all using (auth.uid() = user_id);
create policy "Users manage own push" on public.push_subscriptions for all using (auth.uid() = user_id);

-- 12. Auto-Profile Creation Trigger on auth.users Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, initials, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pawi User'),
    coalesce(substring(new.raw_user_meta_data->>'name' from 1 for 2), 'PU'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 13. Receipts Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Storage policies: Users can only upload and read files in their own user folder (folder prefix = auth.uid())
create policy "Users manage own receipt images" on storage.objects
  for all using (bucket_id = 'receipts' and (auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'receipts' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Indexes for performance
create index if not exists idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index if not exists idx_accounts_user on public.accounts (user_id);
create index if not exists idx_categories_user on public.categories (user_id);
create index if not exists idx_savings_goals_user on public.savings_goals (user_id);
create index if not exists idx_recurring_bills_user on public.recurring_bills (user_id);
create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);
