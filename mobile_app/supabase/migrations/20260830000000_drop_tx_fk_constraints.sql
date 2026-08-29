-- Pawi Financial Tracker — Migration: Drop FK constraints on transactions
-- table so account_id and category_id can store human-readable name strings.
--
-- Root cause of "transactions disappearing" bug:
--   The app stored wallet names ("GCash") and category names ("Freelance") as
--   account_id / category_id. These columns had FK references to accounts(id)
--   and categories(id) which use ids like "gcash_<userId>" — not names.
--   Every INSERT fired a silent 23503 foreign_key_violation, causing all
--   new transactions to be discarded without any user-visible error.
--
-- Fix: Drop the FK constraints so the columns accept any text value.
--   account_id and category_id now store human-readable wallet/category names.
--   This matches the app's architecture where names are used as display keys.

-- Drop FK constraint on account_id
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

-- Drop FK constraint on category_id
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- Add comments documenting the intentional decision
COMMENT ON COLUMN public.transactions.account_id IS
  'Human-readable wallet/account name (e.g. "GCash", "BPI Savings"). '
  'Not a FK — constraint dropped 2026-08-30 to match app architecture.';

COMMENT ON COLUMN public.transactions.category_id IS
  'Human-readable category name (e.g. "Freelance", "Transport"). '
  'Not a FK — constraint dropped 2026-08-30 to match app architecture.';
