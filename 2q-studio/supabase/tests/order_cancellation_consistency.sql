BEGIN;

DO $$
DECLARE
  v_cancel_order_source TEXT;
  v_cancel_transaction_source TEXT;
  v_guard_source TEXT;
  v_notification_source TEXT;
  v_checkout_source TEXT;
  v_count INT;
BEGIN
  SELECT pg_get_functiondef('public.cancel_order(uuid,text)'::regprocedure)
  INTO v_cancel_order_source;

  IF position('reversal_of_transaction_id' IN v_cancel_order_source) = 0
     OR position('ORDER_SALE_TRANSACTION_NOT_FOUND' IN v_cancel_order_source) = 0
     OR position('FOR UPDATE' IN v_cancel_order_source) = 0
     OR position('SET status = ''in_stock''' IN v_cancel_order_source) = 0 THEN
    RAISE EXCEPTION 'cancel_order does not enforce the linked, locked refund workflow';
  END IF;

  SELECT string_agg(pg_get_functiondef(proc.oid), E'\n')
  INTO v_checkout_source
  FROM pg_proc proc
  JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
  WHERE namespace.nspname = 'public'
    AND proc.proname = 'checkout_order';

  IF position('''paid''' IN COALESCE(v_checkout_source, '')) = 0
     OR position('SET status = ''sold''' IN COALESCE(v_checkout_source, '')) = 0
     OR position('INSERT INTO public.transactions' IN COALESCE(v_checkout_source, '')) = 0 THEN
    RAISE EXCEPTION 'checkout_order no longer atomically marks orders paid and products sold';
  END IF;

  SELECT pg_get_functiondef('public.cancel_transaction(uuid,text)'::regprocedure)
  INTO v_cancel_transaction_source;

  IF position('ORDER_TRANSACTION_IMMUTABLE' IN v_cancel_transaction_source) = 0 THEN
    RAISE EXCEPTION 'cancel_transaction can still cancel order-backed entries';
  END IF;

  SELECT pg_get_functiondef('public.guard_order_transaction_mutation()'::regprocedure)
  INTO v_guard_source;

  IF position('ORDER_TRANSACTION_IMMUTABLE' IN v_guard_source) = 0
     OR position('TRANSACTION_DELETE_FORBIDDEN' IN v_guard_source) = 0 THEN
    RAISE EXCEPTION 'transaction mutation guard is incomplete';
  END IF;

  SELECT pg_get_functiondef('public.notify_transaction_insert()'::regprocedure)
  INTO v_notification_source;

  IF position('Đơn hàng đã hủy' IN v_notification_source) = 0
     OR position('NEW.entry_kind = ''refund''' IN v_notification_source) = 0 THEN
    RAISE EXCEPTION 'Refund notifications are not classified as cancellations';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM pg_trigger
  WHERE tgrelid = 'public.transactions'::regclass
    AND tgname = 'guard_order_transaction_mutation_trigger'
    AND NOT tgisinternal;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected one order transaction guard trigger, found %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'transactions'
    AND indexname IN ('uq_transactions_reversal', 'idx_transactions_reporting');

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Cancellation/reporting indexes are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'Direct transaction write policies must not exist';
  END IF;

  PERFORM 'public.get_admin_dashboard_metrics(date)'::regprocedure;
  PERFORM 'public.get_personal_revenue(date)'::regprocedure;
  PERFORM 'public.record_expense(uuid,public.transaction_category,numeric,text)'::regprocedure;
END;
$$;

ROLLBACK;
