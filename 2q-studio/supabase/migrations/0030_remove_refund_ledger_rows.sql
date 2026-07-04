-- Keep cancelled orders for audit, but represent cancellation on the original
-- sale transaction instead of creating a second refund transaction.

DROP TRIGGER IF EXISTS guard_order_transaction_mutation_trigger ON public.transactions;

-- Repair legacy order-backed sale transactions from the order source of truth.
UPDATE public.transactions target_transaction
SET status = CASE
      WHEN orders.status = 'cancelled' THEN 'cancelled'
      ELSE 'completed'
    END,
    cancel_reason = CASE
      WHEN orders.status = 'cancelled' THEN orders.cancel_reason
      ELSE NULL
    END,
    cancelled_at = CASE
      WHEN orders.status = 'cancelled' THEN orders.cancelled_at
      ELSE NULL
    END,
    cancelled_by = CASE
      WHEN orders.status = 'cancelled' THEN orders.cancelled_by
      ELSE NULL
    END
FROM public.orders orders
WHERE target_transaction.order_id = orders.id
  AND target_transaction.type = 'income'
  AND target_transaction.category = 'sale';

-- Refund rows were an implementation detail and are no longer part of the model.
DELETE FROM public.transactions
WHERE entry_kind = 'refund';

DROP INDEX IF EXISTS public.uq_transactions_reversal;
DROP INDEX IF EXISTS public.idx_transactions_reporting;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_refund_shape_check,
  DROP CONSTRAINT IF EXISTS transactions_entry_kind_check,
  DROP COLUMN IF EXISTS reversal_of_transaction_id,
  DROP COLUMN IF EXISTS entry_kind;

CREATE INDEX IF NOT EXISTS idx_transactions_reporting
  ON public.transactions(business_date, status, type)
  INCLUDE (amount, order_id, recorded_by);

CREATE OR REPLACE FUNCTION public.notify_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_notification_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
BEGIN
  v_title := CASE
    WHEN NEW.order_id IS NOT NULL THEN 'Đơn hàng mới'
    WHEN NEW.type = 'income' THEN 'Khoản thu mới'
    ELSE 'Khoản chi mới'
  END;

  v_body := COALESCE(NULLIF(NEW.description, ''), 'Giao dịch mới')
    || ' - ' || NEW.amount::TEXT || ' VND';
  v_url := CASE
    WHEN NEW.order_id IS NOT NULL THEN '/pos/bill/' || NEW.order_id::TEXT
    ELSE '/admin/transactions'
  END;

  INSERT INTO public.notifications (type, title, body, data)
  VALUES (
    'transaction',
    v_title,
    v_body,
    jsonb_build_object(
      'notification_id', NULL,
      'transaction_id', NEW.id,
      'order_id', NEW.order_id,
      'store_id', NEW.store_id,
      'transaction_type', NEW.type,
      'category', NEW.category,
      'url', v_url
    )
  )
  RETURNING id INTO v_notification_id;

  UPDATE public.notifications
  SET data = jsonb_set(data, '{notification_id}', to_jsonb(v_notification_id::TEXT))
  WHERE id = v_notification_id;

  INSERT INTO public.notification_recipients (notification_id, user_id)
  SELECT v_notification_id, id
  FROM public.profiles
  WHERE role = 'admin' AND is_active = TRUE;

  RETURN NEW;
END;
$$;

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
        WHERE t.status = 'completed' AND t.type = 'expense'
      ), 0) AS expenses
    FROM public.transactions t
    WHERE (p_start_date IS NULL OR t.business_date >= p_start_date)
      AND (p_end_date IS NULL OR t.business_date < p_end_date)
  )
  SELECT
    totals.income,
    totals.expenses,
    totals.income - totals.expenses
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

CREATE OR REPLACE FUNCTION public.get_personal_revenue(
  p_business_date DATE DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_business_date DATE := COALESCE(
    p_business_date,
    (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
  );
  v_revenue NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_revenue
  FROM public.transactions t
  WHERE t.business_date = v_business_date
    AND t.status = 'completed'
    AND t.type = 'income'
    AND t.recorded_by = v_user_id;

  RETURN v_revenue;
END;
$$;

DROP FUNCTION IF EXISTS public.cancel_transaction(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.guard_order_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'TRANSACTION_DELETE_FORBIDDEN';
  END IF;

  IF OLD.order_id IS NOT NULL THEN
    IF OLD.status = 'completed'
       AND NEW.status = 'cancelled'
       AND NULLIF(BTRIM(NEW.cancel_reason), '') IS NOT NULL
       AND NEW.cancelled_at IS NOT NULL
       AND NEW.cancelled_by IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.orders orders
         WHERE orders.id = OLD.order_id
           AND orders.status = 'cancelled'
       )
       AND NEW.store_id IS NOT DISTINCT FROM OLD.store_id
       AND NEW.type IS NOT DISTINCT FROM OLD.type
       AND NEW.category IS NOT DISTINCT FROM OLD.category
       AND NEW.amount IS NOT DISTINCT FROM OLD.amount
       AND NEW.description IS NOT DISTINCT FROM OLD.description
       AND NEW.recorded_by IS NOT DISTINCT FROM OLD.recorded_by
       AND NEW.order_id IS NOT DISTINCT FROM OLD.order_id
       AND NEW.business_date IS NOT DISTINCT FROM OLD.business_date
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'ORDER_TRANSACTION_IMMUTABLE: use cancel_order';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_order_transaction_mutation_trigger
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_transaction_mutation();

CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
  v_order public.orders%ROWTYPE;
  v_sale_transaction_id UUID;
  v_item RECORD;
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

  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'CANCEL_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN;
  END IF;

  SELECT id INTO v_sale_transaction_id
  FROM public.transactions
  WHERE order_id = p_order_id
    AND type = 'income'
    AND category = 'sale'
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_SALE_TRANSACTION_NOT_FOUND';
  END IF;

  FOR v_item IN
    SELECT order_item.product_id
    FROM public.order_items order_item
    WHERE order_item.order_id = p_order_id
    ORDER BY order_item.product_id
  LOOP
    PERFORM 1
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    UPDATE public.products
    SET status = 'in_stock',
        sold_at = NULL,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    INSERT INTO public.inventory_movements (
      product_id, to_store_id, movement_type, order_id, reason, created_by
    ) VALUES (
      v_item.product_id,
      v_order.store_id,
      'return',
      p_order_id,
      'Order cancelled: ' || BTRIM(p_reason),
      v_user_id
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = v_user_id,
      cancel_reason = BTRIM(p_reason),
      updated_at = NOW()
  WHERE id = p_order_id;

  UPDATE public.transactions
  SET status = 'cancelled',
      cancel_reason = BTRIM(p_reason),
      cancelled_at = NOW(),
      cancelled_by = v_user_id
  WHERE id = v_sale_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_financial_summary(DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics(DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_personal_revenue(DATE) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_personal_revenue(DATE) TO authenticated;
