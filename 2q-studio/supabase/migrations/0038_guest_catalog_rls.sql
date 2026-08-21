-- ==============================================================================
-- 0038_guest_catalog_rls.sql
-- Allow unauthenticated (anon) users to read products for the public /shop page.
--
-- Security rules:
--   • Guests can ONLY see:  status = 'in_stock' AND approval_status = 'approved'
--   • Pending, rejected, sold, archived items are invisible at DB level.
--   • Write/mutate policies are completely unaffected (still require authenticated role).
-- ==============================================================================

CREATE POLICY "products_anon_read" ON public.products
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NULL
    AND status = 'in_stock'
    AND approval_status = 'approved'
  );

CREATE POLICY "images_anon_read" ON public.product_images
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NULL
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.status = 'in_stock'
        AND p.approval_status = 'approved'
    )
  );
