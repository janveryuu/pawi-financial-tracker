-- Pawi Financial Tracker — Migration: Branching Onboarding & Decoupled Tutorial Trigger
-- Adds: profile_type ('student', 'working_student', 'professional'), weekly_allowance, tutorial_completed

-- 1. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text DEFAULT 'student' CHECK (profile_type IN ('student', 'working_student', 'professional')),
  ADD COLUMN IF NOT EXISTS weekly_allowance numeric(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;

-- 2. Backfill profile_type from existing is_student boolean where profile_type is NULL
UPDATE public.profiles
SET profile_type = CASE WHEN is_student = true THEN 'student' ELSE 'professional' END
WHERE profile_type IS NULL;

-- 3. Update handle_new_user trigger to include default profile_type and tutorial_completed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, initials, avatar_url,
    profile_type, is_student, weekly_allowance,
    onboarding_completed, onboarding_step, tutorial_completed,
    notifications_enabled, currency, country
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pawi User'),
    COALESCE(SUBSTRING(new.raw_user_meta_data->>'name' FROM 1 FOR 2), 'PU'),
    new.raw_user_meta_data->>'avatar_url',
    'student', -- profile_type default
    true,      -- is_student default
    0.00,      -- weekly_allowance default
    false,     -- onboarding_completed (triggers onboarding)
    0,         -- onboarding_step
    false,     -- tutorial_completed (triggers tutorial after onboarding)
    false,     -- notifications_enabled
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

-- Re-bind trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Index for high-performance trigger checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_tutorial ON public.profiles (id, onboarding_completed, tutorial_completed);
