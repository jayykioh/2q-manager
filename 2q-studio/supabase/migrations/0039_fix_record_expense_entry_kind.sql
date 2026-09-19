-- Fix record_expense: remove stale entry_kind column reference.
-- Migration 0027 inserted entry_kind = 'regular' but migration 0030 dropped that column.
-- The live function body was never updated, causing:
--   "column entry_kind of relation transactions does not exist"

CREATE OR REPLACE FUNCTION public.record_expense(
  p_store_id UUID,
  p_category public.transaction_category,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
  v_transaction_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF p_category NOT IN (
    'import'::public.transaction_category,
    'salary'::public.transaction_category,
    'marketing'::public.transaction_category,
    'shipping'::public.transaction_category,
    'rent'::public.transaction_category,
    'other_expense'::public.transaction_category
  ) THEN
    RAISE EXCEPTION 'INVALID_EXPENSE_CATEGORY';
  END IF;

  INSERT INTO public.transactions (
    store_id, type, category, amount, description, recorded_by, status
  ) VALUES (
    p_store_id, 'expense', p_category, p_amount, NULLIF(BTRIM(p_description), ''),
    v_user_id, 'completed'
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_expense(UUID, public.transaction_category, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_expense(UUID, public.transaction_category, NUMERIC, TEXT) TO authenticated;
