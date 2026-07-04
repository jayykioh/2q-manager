BEGIN;

DO $$
DECLARE
  v_cancel_order_source TEXT;
  v_guard_source TEXT;
  v_notification_source TEXT;
  v_checkout_source TEXT;
  v_financial_summary_source TEXT;
  v_count INT;
BEGIN
  SELECT pg_get_functiondef('public.cancel_order(uuid,text)'::regprocedure)
  INTO v_cancel_order_source;

  IF position('reversal_of_transaction_id' IN v_cancel_order_source) > 0
     OR position('ORDER_SALE_TRANSACTION_NOT_FOUND' IN v_cancel_order_source) = 0
     OR position('FOR UPDATE' IN v_cancel_order_source) = 0
     OR position('SET status = ''in_stock''' IN v_cancel_order_source) = 0
     OR position('UPDATE public.transactions' IN v_cancel_order_source) = 0
     OR position('SET status = ''cancelled''' IN v_cancel_order_source) = 0 THEN
    RAISE EXCEPTION 'cancel_order does not cancel the original sale transaction atomically';
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

  IF to_regprocedure('public.cancel_transaction(uuid,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'cancel_transaction must not exist; cancel_order is the only cancellation command';
  END IF;

  SELECT pg_get_functiondef('public.get_financial_summary(date,date)'::regprocedure)
  INTO v_financial_summary_source;

  IF position('entry_kind' IN v_financial_summary_source) > 0
     OR position('t.status = ''completed''' IN v_financial_summary_source) = 0 THEN
    RAISE EXCEPTION 'Financial summary must use completed transactions without a refund ledger';
  END IF;

  SELECT pg_get_functiondef('public.guard_order_transaction_mutation()'::regprocedure)
  INTO v_guard_source;

  IF position('ORDER_TRANSACTION_IMMUTABLE' IN v_guard_source) = 0
     OR position('TRANSACTION_DELETE_FORBIDDEN' IN v_guard_source) = 0 THEN
    RAISE EXCEPTION 'transaction mutation guard is incomplete';
  END IF;

  SELECT pg_get_functiondef('public.notify_transaction_insert()'::regprocedure)
  INTO v_notification_source;

  IF position('entry_kind' IN v_notification_source) > 0
     OR position('refund' IN lower(v_notification_source)) > 0 THEN
    RAISE EXCEPTION 'Transaction notifications still depend on the removed refund model';
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
    AND indexname = 'idx_transactions_reporting';

  IF v_count <> 1 OR EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND indexname = 'uq_transactions_reversal'
  ) THEN
    RAISE EXCEPTION 'Reporting index is missing or reversal index still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name IN ('entry_kind', 'reversal_of_transaction_id')
  ) THEN
    RAISE EXCEPTION 'Refund-only transaction columns still exist';
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
