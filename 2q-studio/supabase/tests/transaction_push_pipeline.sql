BEGIN;

DO $$
DECLARE
  v_trigger_count INT;
  v_trigger_source TEXT;
  v_checkout_source TEXT;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.transactions'::regclass
    AND tgname = 'transaction_notify_trigger'
    AND NOT tgisinternal;

  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one transaction notification trigger, found %', v_trigger_count;
  END IF;

  SELECT pg_get_functiondef('public.notify_transaction_insert()'::regprocedure)
  INTO v_trigger_source;

  IF position('notification_recipients' IN v_trigger_source) = 0
     OR position('is_active = TRUE' IN v_trigger_source) = 0 THEN
    RAISE EXCEPTION 'Transaction trigger does not atomically create active recipients';
  END IF;

  IF position('role = ''admin''' IN v_trigger_source) > 0 THEN
    RAISE EXCEPTION 'Transaction trigger still contains role = admin';
  END IF;

  IF position('NEW.order_id IS NULL' IN v_trigger_source) > 0 THEN
    RAISE EXCEPTION 'Transaction trigger still excludes bill-generated transactions';
  END IF;

  SELECT string_agg(pg_get_functiondef(p.oid), E'\n')
  INTO v_checkout_source
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'checkout_order';

  IF position('INSERT INTO public.notifications' IN COALESCE(v_checkout_source, '')) > 0 THEN
    RAISE EXCEPTION 'checkout_order must not create notifications directly';
  END IF;

END;
$$;

ROLLBACK;
