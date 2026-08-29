-- Pawi Financial Tracker — Plan Section Persistence Migration
-- Adds tables for debts, receivables, installments, tags with Row Level Security (RLS)
-- and updates recurring_bills.next_due_date to text for flexible date schedules.

-- 1. Debts Table
CREATE TABLE IF NOT EXISTS public.debts (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  lender text NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  monthly_payment numeric(12, 2) NOT NULL DEFAULT 0.00,
  due_date text,
  interest_rate text,
  notes text,
  category text,
  accent text DEFAULT '#E53E3E',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Receivables Table
CREATE TABLE IF NOT EXISTS public.receivables (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  borrower text NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  due_date text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  accent text DEFAULT '#3D784E',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Installments Table
CREATE TABLE IF NOT EXISTS public.installments (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  paid numeric(12, 2) NOT NULL DEFAULT 0.00,
  remaining numeric(12, 2) NOT NULL DEFAULT 0.00,
  monthly_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  card text,
  months_total integer DEFAULT 12,
  months_paid integer DEFAULT 0,
  end_date text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  color text DEFAULT '#3D784E',
  count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Alter recurring_bills for flexible due dates
ALTER TABLE public.recurring_bills ALTER COLUMN next_due_date TYPE text;
ALTER TABLE public.recurring_bills ALTER COLUMN due_day DROP NOT NULL;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies (Users manage own records)
DROP POLICY IF EXISTS "Users manage own debts" ON public.debts;
CREATE POLICY "Users manage own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own receivables" ON public.receivables;
CREATE POLICY "Users manage own receivables" ON public.receivables FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own installments" ON public.installments;
CREATE POLICY "Users manage own installments" ON public.installments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own tags" ON public.tags;
CREATE POLICY "Users manage own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS idx_receivables_user ON public.receivables (user_id);
CREATE INDEX IF NOT EXISTS idx_installments_user ON public.installments (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON public.tags (user_id);
