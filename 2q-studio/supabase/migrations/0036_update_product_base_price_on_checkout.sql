-- 0036_update_product_base_price_on_checkout.sql
-- Update base_price of product to match the sale_price upon checkout so it reflects the actual sold price.

CREATE OR REPLACE FUNCTION public.checkout_order(
  p_store_id UUID,
  p_items JSONB,
  p_discount NUMERIC,
  p_payment_method public.payment_method,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_idempotency_key UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_existing_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_product_record RECORD;
  item JSONB;
  v_sale_price NUMERIC;
  v_product_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
  IF v_existing_order_id IS NOT NULL THEN
    RETURN v_existing_order_id;
  END IF;

  v_order_number := 'ORD-' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id')::UUID
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_sale_price := (item->>'sale_price')::NUMERIC;

    SELECT * INTO v_product_record FROM public.products WHERE id = v_product_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_product_id; END IF;
    IF v_product_record.status <> 'in_stock' THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: % (status: %)', v_product_id, v_product_record.status; END IF;
    IF v_product_record.approval_status <> 'approved' THEN RAISE EXCEPTION 'PRODUCT_NOT_APPROVED: %', v_product_id; END IF;
    IF v_product_record.current_store_id <> p_store_id THEN RAISE EXCEPTION 'STORE_FORBIDDEN: % is not in this store', v_product_id; END IF;
    IF v_sale_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE: %', v_product_id; END IF;

    v_subtotal := v_subtotal + v_sale_price;
  END LOOP;

  IF p_discount > v_subtotal THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT';
  END IF;
  
  v_total := v_subtotal - p_discount;

  INSERT INTO public.orders (
    order_number, idempotency_key, store_id, status, customer_name, customer_phone,
    payment_method, subtotal, discount, total, created_by, paid_at, notes
  ) VALUES (
    v_order_number, p_idempotency_key, p_store_id, 'paid', p_customer_name, p_customer_phone,
    p_payment_method, v_subtotal, p_discount, v_total, v_user_id, NOW(), p_notes
  ) RETURNING id INTO v_order_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_sale_price := (item->>'sale_price')::NUMERIC;

    INSERT INTO public.order_items (order_id, product_id, sale_price, quantity)
    VALUES (v_order_id, v_product_id, v_sale_price, 1);

    UPDATE public.products
    SET status = 'sold', sold_at = NOW(), updated_at = NOW(), base_price = v_sale_price
    WHERE id = v_product_id;

    INSERT INTO public.inventory_movements (
      product_id, from_store_id, movement_type, order_id, reason, created_by
    ) VALUES (
      v_product_id, p_store_id, 'sale', v_order_id, 'POS Checkout', v_user_id
    );
  END LOOP;

  INSERT INTO public.transactions (
    store_id, type, category, amount, description, recorded_by, order_id
  ) VALUES (
    p_store_id, 'income', 'sale', v_total, 'Thanh toán đơn hàng ' || v_order_number, v_user_id, v_order_id
  );

  RETURN v_order_id;
END;
$$;
