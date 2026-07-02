-- ==============================================================================
-- 0010_admin_products_rls.sql: Add missing admin RLS policies for products
-- ==============================================================================

CREATE POLICY "products_admin_write" ON public.products FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');
CREATE POLICY "images_admin_write" ON public.product_images FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');
