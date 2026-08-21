-- Migration: Auto-insert minimal starter account set (GCash + BDO at 0.00) on auth.users signup

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create User Profile
  insert into public.profiles (id, name, initials, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pawi User'),
    coalesce(substring(new.raw_user_meta_data->>'name' from 1 for 2), 'PU'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- 2. Create Minimal Starter Accounts (GCash + BDO at ₱0.00)
  insert into public.accounts (id, user_id, name, type, balance, currency, is_liability, icon, color)
  values 
    ('gcash_' || new.id, new.id, 'GCash', 'ewallet', 0.00, 'PHP', false, 'gcash', 1),
    ('bdo_' || new.id, new.id, 'BDO', 'savings', 0.00, 'PHP', false, 'bdo', 2)
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger is active
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
