-- ==============================================================================
-- 0015_staff_products_rls.sql: Add staff RLS policies for products
-- ==============================================================================

CREATE POLICY "products_staff_write" ON public.products FOR ALL USING (private.get_user_role() = 'staff') WITH CHECK (private.get_user_role() = 'staff');
CREATE POLICY "images_staff_write" ON public.product_images FOR ALL USING (private.get_user_role() = 'staff') WITH CHECK (private.get_user_role() = 'staff');
