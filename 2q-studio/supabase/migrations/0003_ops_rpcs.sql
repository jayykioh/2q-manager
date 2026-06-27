-- ==============================================================================
-- 0003_ops_rpcs.sql: Back-office Operations & Attendance Workflows
-- ==============================================================================

-- 1. cancel_order
CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID, p_reason TEXT) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_role public.user_role;
  v_user_id UUID;
  v_order_record RECORD;
  item RECORD;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can cancel orders';
  END IF;

  -- Lock order
  SELECT * INTO v_order_record FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_record.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  -- Lock products in stable order
  FOR item IN 
    SELECT oi.product_id, oi.sale_price 
    FROM public.order_items oi 
    WHERE oi.order_id = p_order_id 
    ORDER BY oi.product_id
  LOOP
    -- Lock the product
    PERFORM 1 FROM public.products WHERE id = item.product_id FOR UPDATE;

    -- Return product to inventory
    UPDATE public.products
    SET status = 'in_stock', sold_at = NULL, updated_at = NOW()
    WHERE id = item.product_id;

    -- Create inventory movement (return)
    INSERT INTO public.inventory_movements (
      product_id, to_store_id, movement_type, order_id, reason, created_by
    ) VALUES (
      item.product_id, v_order_record.store_id, 'return', p_order_id, 'Order cancelled: ' || p_reason, v_user_id
    );
  END LOOP;

  -- Update Order status
  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = v_user_id,
      cancel_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Create negative transaction to offset income
  INSERT INTO public.transactions (
    store_id, type, category, amount, description, recorded_by, order_id
  ) VALUES (
    v_order_record.store_id, 'expense', 'other_expense', v_order_record.total, 
    'Hoàn tiền đơn hàng hủy ' || v_order_record.order_number, v_user_id, p_order_id
  );

END;
$$;

-- 2. clock_in
CREATE OR REPLACE FUNCTION clock_in(p_store_id UUID, p_shift_type public.shift_type) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_business_date DATE;
  v_attendance_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_business_date := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;

  INSERT INTO public.attendance (
    staff_id, store_id, shift_type, shift_date, check_in
  ) VALUES (
    v_user_id, p_store_id, p_shift_type, v_business_date, NOW()
  ) RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

-- 3. clock_out
CREATE OR REPLACE FUNCTION clock_out(p_attendance_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_record RECORD;
  v_hours_worked NUMERIC;
  v_hourly_rate NUMERIC;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_record FROM public.attendance WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;

  IF v_record.staff_id <> v_user_id THEN
    RAISE EXCEPTION 'Cannot clock out for another user';
  END IF;

  IF v_record.check_out IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked out';
  END IF;

  -- Calculate hours worked
  v_hours_worked := EXTRACT(EPOCH FROM (NOW() - v_record.check_in)) / 3600;
  
  -- Get hourly rate
  SELECT hourly_rate INTO v_hourly_rate FROM public.profiles WHERE id = v_user_id;

  UPDATE public.attendance
  SET check_out = NOW(),
      hours_worked = ROUND(v_hours_worked::numeric, 2),
      base_pay = ROUND((v_hours_worked * COALESCE(v_hourly_rate, 0))::numeric, 0)
  WHERE id = p_attendance_id;

END;
$$;
