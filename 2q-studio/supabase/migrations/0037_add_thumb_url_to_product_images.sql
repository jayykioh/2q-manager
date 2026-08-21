-- Migration: 0037_add_thumb_url_to_product_images
-- Adds pre-generated thumbnail metadata for product images.
-- Removes the need for Vercel Image Optimization (protects free-tier quota).
--
-- Changes:
--   1. Add thumb_r2_key TEXT and thumb_url TEXT to product_images (both nullable)
--   2. Replace create_product RPC to store thumb_r2_key + thumb_url per image
--
-- Backward-compatible: existing rows keep thumb_r2_key = NULL, thumb_url = NULL.
-- Frontend falls back to public_url when thumb_url IS NULL.

-- ─── 1. Schema changes ───────────────────────────────────────────────────────

ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS thumb_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS thumb_url    TEXT;

-- ─── 2. Drop old overloads so CREATE OR REPLACE lands on the right signature ─
--        (migration 0022 left a version with no p_note default and TEXT types
--         for type/tier; drop both known shapes to prevent overload ambiguity)

DROP FUNCTION IF EXISTS public.create_product(TEXT, TEXT, TEXT,        TEXT,        UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_product(TEXT, TEXT, product_type, product_tier, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS public.create_product(TEXT, TEXT, product_type, product_tier, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, TEXT);

-- ─── 3. Hardened create_product ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_product(
  p_sku        TEXT,
  p_name       TEXT,
  p_type       public.product_type,
  p_tier       public.product_tier,
  p_store_id   UUID,
  p_base_price NUMERIC,
  p_length_mm  NUMERIC  DEFAULT NULL,
  p_weight_g   NUMERIC  DEFAULT NULL,
  p_images     JSONB    DEFAULT '[]'::jsonb,
  p_note       TEXT     DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_user_id        UUID;
  v_user_role      public.user_role;
  v_approval_status public.approval_status;
  v_product_id     UUID;
  img              JSONB;
BEGIN
  -- ── Auth ────────────────────────────────────────────────────────────────────
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  -- ── Role-based approval ──────────────────────────────────────────────────────
  -- No store_members table; authorization is via profiles.role.
  -- Both admin and staff may create products; admin auto-approves.
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id AND is_active = TRUE;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found or inactive'
      USING ERRCODE = '28000';
  END IF;

  v_approval_status := CASE WHEN v_user_role = 'admin' THEN 'approved'::public.approval_status
                            ELSE 'pending'::public.approval_status END;

  -- ── Validate p_images ────────────────────────────────────────────────────────
  IF p_images IS NULL THEN
    p_images := '[]'::jsonb;
  ELSIF jsonb_typeof(p_images) <> 'array' THEN
    RAISE EXCEPTION 'p_images must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  -- ── Insert product ───────────────────────────────────────────────────────────
  INSERT INTO public.products (
    sku, name, type, tier, status, approval_status,
    current_store_id, base_price, length_mm, weight_g, created_by, note
  ) VALUES (
    p_sku, p_name, p_type, p_tier, 'in_stock', v_approval_status,
    p_store_id, p_base_price, p_length_mm, p_weight_g, v_user_id, p_note
  ) RETURNING id INTO v_product_id;

  -- ── Insert inventory movement ────────────────────────────────────────────────
  INSERT INTO public.inventory_movements (
    product_id, to_store_id, movement_type, reason, created_by
  ) VALUES (
    v_product_id, p_store_id, 'receive', 'Initial creation', v_user_id
  );

  -- ── Insert images ────────────────────────────────────────────────────────────
  IF jsonb_array_length(p_images) > 0 THEN
    FOR img IN SELECT value FROM jsonb_array_elements(p_images) AS images(value)
    LOOP
      -- Require the two fields that identify the R2 object
      IF NULLIF(img->>'r2_key', '') IS NULL THEN
        RAISE EXCEPTION 'Each image requires r2_key'
          USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.product_images (
        product_id,
        r2_key,
        public_url,
        thumb_r2_key,
        thumb_url,
        blur_data,
        width,
        height,
        angle,
        is_primary,
        sort_order
      ) VALUES (
        v_product_id,
        img->>'r2_key',
        NULLIF(img->>'public_url',    ''),
        NULLIF(img->>'thumb_r2_key',  ''),
        NULLIF(img->>'thumb_url',     ''),
        NULLIF(img->>'blur_data',     ''),
        COALESCE(NULLIF(img->>'width',  '')::INTEGER, 1200),
        COALESCE(NULLIF(img->>'height', '')::INTEGER, 1200),
        COALESCE(NULLIF(img->>'angle',  ''), 'front'),
        COALESCE(NULLIF(img->>'is_primary', '')::BOOLEAN, FALSE),
        COALESCE(NULLIF(img->>'sort_order', '')::INTEGER, 0)
      );
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$func$;