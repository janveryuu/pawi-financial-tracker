-- Pawi Onboarding Flow — Profile Schema Additions
-- Adds fields for: payday config, primary goal, student flag sync, notifications pref
-- All columns use safe defaults and are nullable where the user may skip or not answer.

-- 1. Add payday configuration columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payday_type text DEFAULT 'once' CHECK (payday_type IN ('once', 'twice')),
  ADD COLUMN IF NOT EXISTS payday_day_1 integer CHECK (payday_day_1 >= 1 AND payday_day_1 <= 31),
  ADD COLUMN IF NOT EXISTS payday_day_2 integer CHECK (payday_day_2 >= 1 AND payday_day_2 <= 31),
  ADD COLUMN IF NOT EXISTS primary_goal text CHECK (
    primary_goal IN (
      'emergency_fund',
      'save_specific',
      'pay_debt',
      'track_spending',
      'grow_savings'
    )
  ),
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- 2. Ensure the columns that should already exist do exist (safe idempotent adds)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_income numeric(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_student boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'PH';

-- 3. Update the handle_new_user trigger to also set sensible onboarding defaults
-- We update the trigger function so new users start at step 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, initials, avatar_url,
    onboarding_completed, onboarding_step,
    notifications_enabled, is_student,
    currency, country
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pawi User'),
    COALESCE(SUBSTRING(new.raw_user_meta_data->>'name' FROM 1 FOR 2), 'PU'),
    new.raw_user_meta_data->>'avatar_url',
    false, -- onboarding_completed
    0,     -- onboarding_step (start from step 0)
    false, -- notifications_enabled (ask during onboarding)
    true,  -- is_student (default, overridden in onboarding)
    'PHP',
    'PH'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create minimal starter accounts (GCash + BDO at ₱0.00)
  INSERT INTO public.accounts (id, user_id, name, type, balance, currency, is_liability, icon, color)
  VALUES
    ('gcash_' || new.id, new.id, 'GCash', 'ewallet', 0.00, 'PHP', false, 'gcash', 1),
    ('bdo_' || new.id, new.id, 'BDO', 'savings', 0.00, 'PHP', false, 'bdo', 2)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Index for fast onboarding_completed lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles (id, onboarding_completed);
