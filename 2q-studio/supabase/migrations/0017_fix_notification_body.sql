-- ==============================================================================
-- 0017_fix_notification_body.sql: Fix notification column name from message to body
-- ==============================================================================

CREATE OR REPLACE FUNCTION notify_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_id UUID;
BEGIN
  IF NEW.order_id IS NULL THEN
    INSERT INTO public.notifications (type, title, body)
    VALUES ('transaction', 
            CASE WHEN NEW.type = 'income' THEN 'Khoản thu mới' ELSE 'Khoản chi mới' END,
            COALESCE(NEW.description, 'Giao dịch mới') || ' - ' || NEW.amount::TEXT)
    RETURNING id INTO v_notification_id;

    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notification_recipients (notification_id, user_id)
      VALUES (v_notification_id, v_admin_id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;
