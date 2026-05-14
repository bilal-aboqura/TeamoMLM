-- ============================================================
-- Migration: Fix pay-later locked profit calculation
-- Feature: Pay Later Package Upgrades
-- Scope: Forward-only function fix. Existing pay_later_debts rows are not
-- recalculated or updated because prior balances/withdrawals must remain as-is.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_approve_task(
  p_log_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row          RECORD;
  v_debt         RECORD;
  v_locked_delta NUMERIC := 0;
BEGIN
  SELECT user_id, reward_amount_snapshot, status
    INTO v_row
    FROM public.task_completion_logs
    WHERE id = p_log_id
    FOR UPDATE;

  IF v_row.status IS NULL THEN
    RAISE EXCEPTION 'Task completion log not found';
  END IF;

  IF v_row.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  SELECT d.id,
         from_pkg.daily_profit AS from_daily_profit,
         to_pkg.daily_task_count AS to_task_count
    INTO v_debt
    FROM public.pay_later_debts d
    JOIN public.packages from_pkg ON from_pkg.id = d.from_package_id
    JOIN public.packages to_pkg ON to_pkg.id = d.to_package_id
    WHERE d.user_id = v_row.user_id
      AND d.status IN ('active', 'pending_review', 'overdue')
    ORDER BY d.upgraded_at DESC
    LIMIT 1
    FOR UPDATE OF d;

  IF FOUND THEN
    v_locked_delta := ROUND(v_debt.from_daily_profit / v_debt.to_task_count, 4);
  END IF;

  UPDATE public.task_completion_logs
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_log_id;

  UPDATE public.users
    SET wallet_balance = wallet_balance + v_row.reward_amount_snapshot,
        total_earned = total_earned + v_row.reward_amount_snapshot
    WHERE id = v_row.user_id;

  IF v_locked_delta > 0 THEN
    UPDATE public.pay_later_debts
      SET locked_profit = locked_profit + v_locked_delta
      WHERE id = v_debt.id;
  END IF;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_log_id, 'task_completion_log', 'pending', 'approved', p_admin_id);
END;
$$;
