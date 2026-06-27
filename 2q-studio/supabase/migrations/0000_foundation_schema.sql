-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE product_type AS ENUM ('bracelet', 'ring', 'earring', 'necklace', 'anklet', 'other');
CREATE TYPE product_tier AS ENUM ('premium', 'standard');
CREATE TYPE product_status AS ENUM ('in_stock', 'sold', 'reserved', 'archived');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'momo', 'vnpay');
CREATE TYPE shift_type AS ENUM ('morning', 'afternoon', 'full_day', 'custom');
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE movement_type AS ENUM ('receive', 'transfer', 'sale', 'return', 'adjustment');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_category AS ENUM ('sale', 'import', 'salary', 'other_expense', 'manual_income');

-- TABLES

-- STORES
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROFILES (Users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  role        user_role NOT NULL DEFAULT 'staff',
  avatar_url  TEXT,
  hourly_rate NUMERIC(10,0) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF STORES
CREATE TABLE staff_stores (
  staff_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, store_id)
);

-- PRODUCTS
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  type          product_type NOT NULL,
  tier          product_tier NOT NULL DEFAULT 'standard',
  status        product_status NOT NULL DEFAULT 'in_stock',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  current_store_id UUID NOT NULL REFERENCES stores(id),
  base_price    NUMERIC(10,0) NOT NULL CHECK (base_price >= 0),
  length_mm     NUMERIC(6,1),
  weight_g      NUMERIC(6,2),
  sold_at       TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reserved_until IS NULL OR status = 'reserved'),
  CHECK (sold_at IS NULL OR status IN ('sold', 'archived'))
);

-- PRODUCT IMAGES
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  public_url  TEXT,
  blur_data   TEXT,
  width       INT CHECK (width > 0),
  height      INT CHECK (height > 0),
  angle       TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDERS
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE NOT NULL,
  idempotency_key UUID UNIQUE NOT NULL,
  store_id        UUID NOT NULL REFERENCES stores(id),
  status          order_status NOT NULL DEFAULT 'pending',
  customer_name   TEXT,
  customer_phone  TEXT,
  payment_method  payment_method NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  subtotal        NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount        NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total           NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes           TEXT,
  invoice_r2_key  TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  paid_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    UUID REFERENCES profiles(id),
  cancel_reason   TEXT,
  business_date   DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (discount <= subtotal),
  CHECK (total = subtotal - discount),
  CHECK ((status <> 'paid') OR paid_at IS NOT NULL),
  CHECK ((status <> 'cancelled') OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL))
);

-- ORDER ITEMS
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  sale_price  NUMERIC(10,0) NOT NULL CHECK (sale_price >= 0),
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity = 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, product_id)
);

-- ATTENDANCE
CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     UUID NOT NULL REFERENCES profiles(id),
  store_id     UUID NOT NULL REFERENCES stores(id),
  shift_type   shift_type NOT NULL,
  shift_date   DATE NOT NULL,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  hours_worked NUMERIC(4,2),
  base_pay     NUMERIC(10,0),
  bonus        NUMERIC(10,0) NOT NULL DEFAULT 0,
  notes        TEXT,
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, store_id, shift_date, shift_type),
  CHECK (check_out IS NULL OR (check_in IS NOT NULL AND check_out >= check_in)),
  CHECK (hours_worked IS NULL OR hours_worked >= 0)
);

-- SHIFT CONFIG
CREATE TABLE shift_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id),
  name         TEXT NOT NULL,
  shift_type   shift_type NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  hours        NUMERIC(4,2) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (store_id, shift_type)
);

-- TRANSACTIONS
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  type            transaction_type NOT NULL,
  category        transaction_category NOT NULL,
  amount          NUMERIC(12,0) NOT NULL CHECK (amount > 0),
  description     TEXT,
  recorded_by     UUID REFERENCES profiles(id),
  order_id        UUID REFERENCES orders(id) NULL,
  business_date   DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_recipients (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  push_status      TEXT,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint      TEXT UNIQUE NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  device_name   TEXT,
  user_agent    TEXT,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVENTORY MOVEMENTS
CREATE TABLE inventory_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id),
  from_store_id  UUID REFERENCES stores(id),
  to_store_id    UUID REFERENCES stores(id),
  movement_type  movement_type NOT NULL,
  order_id       UUID REFERENCES orders(id),
  reason         TEXT,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_store_id IS DISTINCT FROM to_store_id)
);

-- SERVER-ONLY ASYNC WORK
CREATE TABLE invoice_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status        job_status NOT NULL DEFAULT 'pending',
  attempts      INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error    TEXT,
  available_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID UNIQUE NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  status          job_status NOT NULL DEFAULT 'pending',
  attempts        INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error      TEXT,
  available_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_products_store_status ON products(current_store_id, status, created_at DESC);
CREATE INDEX idx_products_pos ON products(current_store_id, status, approval_status) WHERE status = 'in_stock' AND approval_status = 'approved';
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, shift_date DESC);
CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id, read_at);
CREATE INDEX idx_inventory_product_time ON inventory_movements(product_id, created_at DESC);
CREATE UNIQUE INDEX one_primary_image_per_product ON product_images(product_id) WHERE is_primary = TRUE;
CREATE UNIQUE INDEX one_primary_store_per_staff ON staff_stores(staff_id) WHERE is_primary = TRUE;
CREATE INDEX idx_invoice_jobs_queue ON invoice_jobs(status, available_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_notif_outbox_queue ON notification_outbox(status, available_at) WHERE status IN ('pending', 'failed');

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoice_jobs_updated BEFORE UPDATE ON invoice_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS CONFIGURATION
ALTER TABLE stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_stores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active = TRUE
$$;

-- RLS POLICIES
CREATE POLICY "profiles_read_self_or_admin" ON profiles FOR SELECT USING (id = (SELECT auth.uid()) OR private.get_user_role() = 'admin');
CREATE POLICY "profiles_admin_write" ON profiles FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "stores_authenticated_read" ON stores FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "stores_admin_write" ON stores FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "staff_stores_read_self_or_admin" ON staff_stores FOR SELECT USING (staff_id = (SELECT auth.uid()) OR private.get_user_role() = 'admin');
CREATE POLICY "staff_stores_admin_write" ON staff_stores FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "products_authenticated_read" ON products FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "images_authenticated_read" ON product_images FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "orders_read_self_or_admin" ON orders FOR SELECT USING (created_by = (SELECT auth.uid()) OR private.get_user_role() = 'admin');
CREATE POLICY "items_read_through_order" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.created_by = (SELECT auth.uid()) OR private.get_user_role() = 'admin')));

CREATE POLICY "attendance_read_self_or_admin" ON attendance FOR SELECT USING (staff_id = (SELECT auth.uid()) OR private.get_user_role() = 'admin');

CREATE POLICY "shift_authenticated_read" ON shift_config FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "shift_admin_write" ON shift_config FOR ALL USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "notification_read_recipient" ON notifications FOR SELECT USING (EXISTS (SELECT 1 FROM notification_recipients nr WHERE nr.notification_id = id AND nr.user_id = (SELECT auth.uid())));
CREATE POLICY "recipient_read_own" ON notification_recipients FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "push_subscription_own" ON push_subscriptions FOR ALL USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "inventory_admin_read" ON inventory_movements FOR SELECT USING (private.get_user_role() = 'admin');
CREATE POLICY "transactions_admin_read" ON transactions FOR SELECT USING (private.get_user_role() = 'admin');

-- RPC STUBS (To be fully implemented in Phase 2/3, currently just raising exceptions or basic stubs to allow schema load)

CREATE OR REPLACE FUNCTION checkout_order(
  p_store_id UUID,
  p_items JSONB,
  p_discount NUMERIC,
  p_payment_method payment_method,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_idempotency_key UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;

CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID, p_reason TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;

CREATE OR REPLACE FUNCTION clock_in(p_store_id UUID, p_shift_type shift_type) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;

CREATE OR REPLACE FUNCTION clock_out(p_attendance_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;

CREATE OR REPLACE FUNCTION create_product(
  p_sku TEXT, p_name TEXT, p_type product_type, p_tier product_tier,
  p_store_id UUID, p_base_price NUMERIC, p_length_mm NUMERIC, p_weight_g NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;
