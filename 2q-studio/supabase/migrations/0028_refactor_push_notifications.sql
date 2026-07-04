-- 1. Unschedule the pg_cron job
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_extension 
    WHERE extname = 'pg_cron'
  ) THEN
    IF EXISTS (
      SELECT 1 
      FROM cron.job 
      WHERE jobname = 'process-notification-outbox'
    ) THEN
      PERFORM cron.unschedule('process-notification-outbox');
    END IF;
  END IF;
END;
$$;

-- 2. Drop the tables related to the outbox and delivery tracking
DROP TABLE IF EXISTS public.notification_push_deliveries CASCADE;
DROP TABLE IF EXISTS public.notification_outbox CASCADE;

-- 3. Drop the outbox claiming RPC
DROP FUNCTION IF EXISTS public.claim_notification_outbox(INT);

-- 4. Recreate the trigger function to only insert notifications without outbox queuing
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

REVOKE ALL ON FUNCTION public.notify_transaction_insert() FROM PUBLIC, anon, authenticated;
