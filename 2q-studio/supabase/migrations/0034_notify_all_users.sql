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
  v_formatted_amount TEXT;
BEGIN
  -- Format amount with dot as thousands separator: 500,000 -> 500.000
  v_formatted_amount := replace(to_char(NEW.amount, 'FM999,999,999,999'), ',', '.');

  v_title := CASE
    WHEN NEW.order_id IS NOT NULL THEN 'Bạn có đơn hàng mới'
    WHEN NEW.type = 'income' THEN 'Khoản thu mới'
    ELSE 'Khoản chi mới'
  END;

  v_body := CASE
    WHEN NEW.order_id IS NOT NULL THEN
      'Tổng đơn: +' || v_formatted_amount || ' VND'
    WHEN NEW.type = 'income' THEN
      COALESCE(NULLIF(NEW.description, ''), 'Giao dịch mới') || ' (+' || v_formatted_amount || ' VND)'
    ELSE
      COALESCE(NULLIF(NEW.description, ''), 'Giao dịch mới') || ' (-' || v_formatted_amount || ' VND)'
  END;

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
  WHERE is_active = TRUE;

  RETURN NEW;
END;
$$;
