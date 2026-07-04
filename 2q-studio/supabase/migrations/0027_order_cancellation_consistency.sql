-- Make order cancellation the only command that can mutate an order-backed sale.
-- Financial entries remain append-only: a cancelled order creates one linked refund.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS entry_kind TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id UUID REFERENCES public.transactions(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id);

-- Normalize legacy order transactions before enforcing the new invariants.
-- An order-backed sale is always retained as a completed ledger entry.
UPDATE public.transactions
SET status = 'completed',
    cancel_reason = NULL,
    cancelled_at = NULL,
    cancelled_by = NULL
WHERE order_id IS NOT NULL
  AND type = 'income'
  AND category = 'sale';

WITH sale_transactions AS (
  SELECT DISTINCT ON (t.order_id)
    t.id,
    t.order_id
  FROM public.transactions t
  WHERE t.order_id IS NOT NULL
    AND t.type = 'income'
    AND t.category = 'sale'
  ORDER BY t.order_id, t.created_at, t.id
), ranked_refunds AS (
  SELECT
    refund.id,
    sale.id AS sale_transaction_id,
    orders.status AS order_status,
    ROW_NUMBER() OVER (
      PARTITION BY sale.id
      ORDER BY refund.created_at, refund.id
    ) AS refund_rank
  FROM public.transactions refund
  JOIN sale_transactions sale ON sale.order_id = refund.order_id
  JOIN public.orders orders ON orders.id = refund.order_id
  WHERE refund.type = 'expense'
)
UPDATE public.transactions target_transaction
SET entry_kind = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN 'refund'
      ELSE 'regular'
    END,
    reversal_of_transaction_id = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN ranked_refunds.sale_transaction_id
      ELSE NULL
    END,
    status = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN 'completed'
      ELSE 'cancelled'
    END,
    cancel_reason = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN NULL
      ELSE COALESCE(target_transaction.cancel_reason, 'Legacy duplicate or orphan refund normalized')
    END,
    cancelled_at = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN NULL
      ELSE COALESCE(target_transaction.cancelled_at, NOW())
    END,
    cancelled_by = CASE
      WHEN ranked_refunds.order_status = 'cancelled' AND ranked_refunds.refund_rank = 1
        THEN NULL
      ELSE COALESCE(target_transaction.cancelled_by, target_transaction.recorded_by)
    END
FROM ranked_refunds
WHERE target_transaction.id = ranked_refunds.id;

-- Backfill missing refunds without emitting user notifications during migration.
ALTER TABLE public.transactions DISABLE TRIGGER transaction_notify_trigger;

WITH sale_transactions AS (
  SELECT DISTINCT ON (t.order_id)
    t.id,
    t.order_id
  FROM public.transactions t
  WHERE t.order_id IS NOT NULL
    AND t.type = 'income'
    AND t.category = 'sale'
  ORDER BY t.order_id, t.created_at, t.id
)
INSERT INTO public.transactions (
  store_id,
  type,
  category,
  amount,
  description,
  recorded_by,
  order_id,
  business_date,
  status,
  entry_kind,
  reversal_of_transaction_id
)
SELECT
  orders.store_id,
  'expense',
  'other_expense',
  orders.total,
  'Hoàn tiền đơn hàng hủy ' || orders.order_number,
  COALESCE(orders.cancelled_by, orders.created_by),
  orders.id,
  COALESCE(
    (orders.cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE,
    orders.business_date
  ),
  'completed',
  'refund',
  sale_transactions.id
FROM public.orders orders
JOIN sale_transactions ON sale_transactions.order_id = orders.id
WHERE orders.status = 'cancelled'
  AND orders.total > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.transactions refund
    WHERE refund.reversal_of_transaction_id = sale_transactions.id
  );

ALTER TABLE public.transactions ENABLE TRIGGER transaction_notify_trigger;

UPDATE public.transactions
SET cancelled_at = COALESCE(cancelled_at, created_at),
    cancelled_by = COALESCE(cancelled_by, recorded_by),
    cancel_reason = COALESCE(NULLIF(BTRIM(cancel_reason), ''), 'Legacy cancellation')
WHERE status = 'cancelled';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check,
  DROP CONSTRAINT IF EXISTS transactions_entry_kind_check,
  ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('completed', 'cancelled')),
  ADD CONSTRAINT transactions_entry_kind_check
    CHECK (entry_kind IN ('regular', 'refund')),
  ADD CONSTRAINT transactions_refund_shape_check
    CHECK (
      (
        entry_kind = 'regular'
        AND reversal_of_transaction_id IS NULL
      )
      OR (
        entry_kind = 'refund'
        AND type = 'expense'
        AND order_id IS NOT NULL
        AND reversal_of_transaction_id IS NOT NULL
      )
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_reversal
  ON public.transactions(reversal_of_transaction_id)
  WHERE reversal_of_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_reporting
  ON public.transactions(business_date, status, type, entry_kind)
  INCLUDE (amount, order_id, recorded_by);

CREATE INDEX IF NOT EXISTS idx_transactions_order_created
  ON public.transactions(order_id, created_at)
  WHERE order_id IS NOT NULL;

-- Keep the existing notification pipeline, but classify refunds as cancellations
-- instead of announcing them as new orders.
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
    WHEN NEW.entry_kind = 'refund' THEN 'Đơn hàng đã hủy'
    WHEN NEW.order_id IS NOT NULL THEN 'Đơn hàng mới'
    WHEN NEW.type = 'income' THEN 'Khoản thu mới'
    ELSE 'Khoản chi mới'
  END;

  v_body := COALESCE(NULLIF(NEW.description, ''), 'Giao dịch mới')
    || ' - ' || NEW.amount::TEXT || ' VND';
  v_url := CASE
    WHEN NEW.entry_kind = 'refund' THEN '/admin/orders'
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
      'entry_kind', NEW.entry_kind,
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

CREATE OR REPLACE FUNCTION public.guard_order_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.order_id IS NOT NULL THEN
    RAISE EXCEPTION 'ORDER_TRANSACTION_IMMUTABLE: use cancel_order';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'TRANSACTION_DELETE_FORBIDDEN: cancel the transaction instead';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_order_transaction_mutation_trigger ON public.transactions;
CREATE TRIGGER guard_order_transaction_mutation_trigger
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_transaction_mutation();

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

  IF p_amount IS NULL OR p_amount <= 0 THEN
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
    store_id, type, category, amount, description, recorded_by, status, entry_kind
  ) VALUES (
    p_store_id, 'expense', p_category, p_amount, NULLIF(BTRIM(p_description), ''),
    v_user_id, 'completed', 'regular'
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_transaction(
  p_transaction_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'CANCEL_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSACTION_NOT_FOUND';
  END IF;

  IF v_transaction.order_id IS NOT NULL THEN
    RAISE EXCEPTION 'ORDER_TRANSACTION_IMMUTABLE: use cancel_order';
  END IF;

  IF v_transaction.status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE public.transactions
  SET status = 'cancelled',
      cancel_reason = BTRIM(p_reason),
      cancelled_at = NOW(),
      cancelled_by = v_user_id
  WHERE id = p_transaction_id;
END;
$$;

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
  v_sale_transaction public.transactions%ROWTYPE;
  v_item RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
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

  SELECT * INTO v_sale_transaction
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

  INSERT INTO public.transactions (
    store_id,
    type,
    category,
    amount,
    description,
    recorded_by,
    order_id,
    status,
    entry_kind,
    reversal_of_transaction_id
  ) VALUES (
    v_order.store_id,
    'expense',
    'other_expense',
    v_order.total,
    'Hoàn tiền đơn hàng hủy ' || v_order.order_number,
    v_user_id,
    p_order_id,
    'completed',
    'refund',
    v_sale_transaction.id
  )
  ON CONFLICT (reversal_of_transaction_id)
    WHERE reversal_of_transaction_id IS NOT NULL
    DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(
  p_business_date DATE DEFAULT NULL
) RETURNS TABLE (
  gross_income NUMERIC,
  refund_amount NUMERIC,
  operating_expense NUMERIC,
  net_revenue NUMERIC,
  net_cash NUMERIC,
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  RETURN QUERY
  WITH finance AS (
    SELECT
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'income'
      ), 0) AS gross,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'expense' AND t.entry_kind = 'refund'
      ), 0) AS refunds,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'expense' AND t.entry_kind = 'regular'
      ), 0) AS expenses
    FROM public.transactions t
    WHERE t.business_date = v_business_date
  )
  SELECT
    finance.gross,
    finance.refunds,
    finance.expenses,
    finance.gross - finance.refunds,
    finance.gross - finance.refunds - finance.expenses,
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
    )
  FROM finance;
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
  v_gross NUMERIC;
  v_refunds NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_gross
  FROM public.transactions t
  WHERE t.business_date = v_business_date
    AND t.status = 'completed'
    AND t.type = 'income'
    AND t.recorded_by = v_user_id;

  SELECT COALESCE(SUM(refund.amount), 0)
  INTO v_refunds
  FROM public.transactions refund
  JOIN public.transactions original
    ON original.id = refund.reversal_of_transaction_id
  WHERE refund.business_date = v_business_date
    AND refund.status = 'completed'
    AND refund.entry_kind = 'refund'
    AND original.recorded_by = v_user_id;

  RETURN v_gross - v_refunds;
END;
$$;

-- All transaction writes now go through audited commands.
DROP POLICY IF EXISTS "transactions_admin_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_delete" ON public.transactions;

REVOKE ALL ON FUNCTION public.record_expense(UUID, public.transaction_category, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_transaction(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_order(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_metrics(DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_personal_revenue(DATE) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_expense(UUID, public.transaction_category, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_personal_revenue(DATE) TO authenticated;
