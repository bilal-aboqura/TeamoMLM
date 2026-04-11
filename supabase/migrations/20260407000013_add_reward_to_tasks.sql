-- ============================================================
-- Migration: Add reward_amount & required_vip_level to tasks
-- Feature: 004-admin-task-management
-- ============================================================

-- reward_amount: Per-task fixed reward override (in USD).
-- NULL = computed dynamically as daily_profit / daily_task_count from the user's package.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(10, 2) DEFAULT NULL;

-- required_vip_level: 0 = available to all active users regardless of package.
-- 1–6 maps to the 6 package tiers (A1 to B3).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS required_vip_level INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tasks.reward_amount IS
  'Optional per-task reward override (USD, 2dp). NULL means reward is computed dynamically from the user package.';

COMMENT ON COLUMN public.tasks.required_vip_level IS
  '0 = all levels. 1-6 = minimum package tier required to see/execute this task.';
