-- Transaction inserts are the single source of user notifications.
-- Notification creation, recipient fan-out, and outbox enqueueing happen in
-- the same database transaction as the financial transaction.

ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.notification_push_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  subscription_id   UUID NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'permanent_failed')),
  attempts          INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_push_deliveries_pending
  ON public.notification_push_deliveries(status, available_at)
  WHERE status = 'pending';

ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_push_deliveries FROM anon, authenticated;
GRANT ALL ON TABLE public.notification_push_deliveries TO service_role;

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

  INSERT INTO public.notification_outbox (notification_id)
  VALUES (v_notification_id);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_transaction_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS transaction_notify_trigger ON public.transactions;
CREATE TRIGGER transaction_notify_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_transaction_insert();

CREATE OR REPLACE FUNCTION public.claim_notification_outbox(p_limit INT DEFAULT 25)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.notification_outbox
    WHERE (
      status = 'pending' AND available_at <= NOW()
    ) OR (
      status = 'processing'
      AND processing_started_at < NOW() - INTERVAL '10 minutes'
    )
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), claimed AS (
    UPDATE public.notification_outbox AS outbox
    SET status = 'processing',
        processing_started_at = NOW(),
        updated_at = NOW()
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING outbox.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_outbox(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(INT) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notification-outbox') THEN
    PERFORM cron.unschedule('process-notification-outbox');
  END IF;
END;
$$;

SELECT cron.schedule(
  'process-notification-outbox',
  '* * * * *',
  $cron$
    SELECT net.http_get(
      url := rtrim((
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'notification_worker_url'
      ), '/') || '/api/jobs/notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'notification_worker_secret'
        )
      )
    );
  $cron$
);
