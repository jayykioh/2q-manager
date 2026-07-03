CREATE POLICY "transactions_admin_insert" ON transactions FOR INSERT WITH CHECK (private.get_user_role() = 'admin');
CREATE POLICY "transactions_admin_update" ON transactions FOR UPDATE USING (private.get_user_role() = 'admin');
CREATE POLICY "transactions_admin_delete" ON transactions FOR DELETE USING (private.get_user_role() = 'admin');
