-- 0022_fix_create_product_rpc.sql

CREATE OR REPLACE FUNCTION create_product(
  p_sku TEXT,
  p_name TEXT,
  p_type product_type,
  p_tier product_tier,
  p_store_id UUID,
  p_base_price NUMERIC,
  p_length_mm NUMERIC,
  p_weight_g NUMERIC,
  p_images JSONB, -- Array of image objects: [{r2_key, public_url, blur_data, width, height, angle, is_primary, sort_order}]
  p_note TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_role public.user_role;
  v_user_id UUID;
  v_approval_status public.approval_status;
  v_product_id UUID;
  img JSONB;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  -- Determine approval status based on role
  IF v_user_role = 'admin' THEN
    v_approval_status := 'approved';
  ELSE
    v_approval_status := 'pending';
  END IF;

  -- Insert product
  INSERT INTO public.products (
    sku, name, type, tier, status, approval_status, current_store_id,
    base_price, length_mm, weight_g, created_by, note
  ) VALUES (
    p_sku, p_name, p_type, p_tier, 'in_stock', v_approval_status, p_store_id,
    p_base_price, p_length_mm, p_weight_g, v_user_id, p_note
  ) RETURNING id INTO v_product_id;

  -- Insert inventory movement (receive)
  INSERT INTO public.inventory_movements (
    product_id, to_store_id, movement_type, reason, created_by
  ) VALUES (
    v_product_id, p_store_id, 'receive', 'Initial creation', v_user_id
  );

  -- Insert images if any
  IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
    FOR img IN SELECT * FROM jsonb_array_elements(p_images)
    LOOP
      INSERT INTO public.product_images (
        product_id, r2_key, public_url, blur_data, width, height, angle, is_primary, sort_order
      ) VALUES (
        v_product_id,
        img->>'r2_key',
        img->>'public_url',
        img->>'blur_data',
        COALESCE((img->>'width')::INTEGER, 1200),
        COALESCE((img->>'height')::INTEGER, 1200),
        COALESCE((img->>'angle'), 'front'),
        COALESCE((img->>'is_primary')::BOOLEAN, false),
        COALESCE((img->>'sort_order')::INTEGER, 0)
      );
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$$;
