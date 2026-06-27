-- Create a default store
INSERT INTO stores (id, name, address, timezone, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2Q Store D1',
  'Quận 1, TP. HCM',
  'Asia/Ho_Chi_Minh',
  true
) ON CONFLICT (id) DO NOTHING;

-- Create default shift configurations for the store
INSERT INTO shift_config (store_id, name, shift_type, start_time, end_time, hours)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ca Sáng', 'morning', '09:00:00', '15:00:00', 6.0),
  ('11111111-1111-1111-1111-111111111111', 'Ca Chiều', 'afternoon', '15:00:00', '21:00:00', 6.0),
  ('11111111-1111-1111-1111-111111111111', 'Cả Ngày', 'full_day', '09:00:00', '21:00:00', 12.0)
ON CONFLICT (store_id, shift_type) DO NOTHING;
