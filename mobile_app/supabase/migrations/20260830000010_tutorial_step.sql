-- Pawi Financial Tracker — Migration: Spotlight Tutorial Step Persistence
-- Adds: tutorial_step (current step index, 0-indexed) to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_step integer DEFAULT 0;

UPDATE public.profiles
SET tutorial_step = 99
WHERE tutorial_completed = true AND tutorial_step = 0;

CREATE INDEX IF NOT EXISTS idx_profiles_tutorial_step
  ON public.profiles (id, tutorial_completed, tutorial_step);
