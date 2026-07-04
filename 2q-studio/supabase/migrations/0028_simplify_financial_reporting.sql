-- Present one financial model everywhere while keeping refunds internal for audit.
-- Order cancellation remains available only through cancel_order.

REVOKE ALL ON FUNCTION public.cancel_transaction(UUID, TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.cancel_transaction(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  revenue NUMERIC,
  operating_expense NUMERIC,
  difference NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  RETURN QUERY
  WITH totals AS (
    SELECT
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'income'
      ), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed'
          AND t.type = 'expense'
          AND t.entry_kind = 'refund'
      ), 0) AS refunds,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed'
          AND t.type = 'expense'
          AND t.entry_kind = 'regular'
      ), 0) AS expenses
    FROM public.transactions t
    WHERE (p_start_date IS NULL OR t.business_date >= p_start_date)
      AND (p_end_date IS NULL OR t.business_date < p_end_date)
  )
  SELECT
    totals.income - totals.refunds,
    totals.expenses,
    totals.income - totals.refunds - totals.expenses
  FROM totals;
END;
$$;

DROP FUNCTION IF EXISTS public.get_admin_dashboard_metrics(DATE);

CREATE FUNCTION public.get_admin_dashboard_metrics(
  p_business_date DATE DEFAULT NULL
) RETURNS TABLE (
  revenue NUMERIC,
  operating_expense NUMERIC,
  difference NUMERIC,
  total_orders BIGINT,
  active_products BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
  v_business_date DATE := COALESCE(
    p_business_date,
    (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
  );
  v_summary RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_summary
  FROM public.get_financial_summary(v_business_date, v_business_date + 1);

  RETURN QUERY
  SELECT
    v_summary.revenue,
    v_summary.operating_expense,
    v_summary.difference,
    (
      SELECT COUNT(*)
      FROM public.orders orders
      WHERE orders.business_date = v_business_date
        AND orders.status <> 'cancelled'
    ),
    (
      SELECT COUNT(*)
      FROM public.products products
      WHERE products.status = 'in_stock'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_financial_summary(DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics(DATE) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_financial_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(DATE) TO authenticated;

