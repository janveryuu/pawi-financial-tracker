-- Pawi Financial Tracker — Push Notification Engine & Deduplication Migration
-- Supports Web Push & Android TWA / APK with unified triggers, preference management, and dedupe log.

-- 1. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE UNIQUE NOT NULL,
  master_enabled boolean DEFAULT true,
  bill_due_reminders boolean DEFAULT true,
  bill_overdue_alerts boolean DEFAULT true,
  daily_overdue_nag boolean DEFAULT false,
  budget_threshold_alerts boolean DEFAULT true,
  budget_exceeded_alerts boolean DEFAULT true,
  goal_milestone_alerts boolean DEFAULT true,
  debt_due_reminders boolean DEFAULT true,
  receivable_expected_reminders boolean DEFAULT true,
  checkin_nudges boolean DEFAULT false,
  payday_alerts boolean DEFAULT true,
  weekly_digest_push boolean DEFAULT true,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '07:00',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create notification_log table for deduplication and inbox
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  related_entity_id text NOT NULL,
  cycle_identifier text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  is_read boolean DEFAULT false,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_notification_dedupe UNIQUE (user_id, notification_type, related_entity_id, cycle_identifier)
);

-- 3. Enhance push_subscriptions table with platform support
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS platform text DEFAULT 'web';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own notification log" ON public.notification_log;
CREATE POLICY "Users read own notification log"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification log read state" ON public.notification_log;
CREATE POLICY "Users update own notification log read state"
  ON public.notification_log FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- 6. Indexes for scheduled cron and evaluation performance
CREATE INDEX IF NOT EXISTS idx_notif_log_user_lookup ON public.notification_log (user_id, notification_type, sent_at);
CREATE INDEX IF NOT EXISTS idx_notif_log_unread ON public.notification_log (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON public.notification_preferences (user_id);
