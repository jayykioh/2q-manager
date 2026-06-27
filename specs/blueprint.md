# 2Q Nhẫn Thuật — System Blueprint

> Hệ thống quản lý nội bộ cho thương hiệu trang sức tái chế muỗng.
> Internal PWA · Mobile-first · Tiếng Việt · Đen trắng

---

## 1. Product Overview

### Tên hệ thống
**2Q Studio** — internal management PWA cho một hoặc nhiều cửa hàng thuộc 2Q Nhẫn Thuật.

### Mục tiêu
Thay thế hoàn toàn quy trình giấy tờ / Zalo manual bằng một tool duy nhất: quản lý kho, tạo hóa đơn, theo dõi nhân viên, và đọc doanh thu — tất cả trên mobile và desktop.

### Phạm vi MVP và nguyên tắc dữ liệu
- **Online-first:** catalog đã xem có thể mở khi mất mạng, nhưng checkout và chấm công bắt buộc có kết nối.
- **Database là source of truth:** client không tự quyết định tổng đơn, trạng thái sản phẩm, giờ công hoặc lương.
- **Mỗi sản phẩm là một món unique:** `quantity = 1`; một sản phẩm không thể xuất hiện trong hai đơn đã thanh toán.
- **Multi-store từ schema:** MVP có thể chạy một cửa hàng, nhưng mọi giao dịch và tồn kho đều gắn `store_id` để không phải migrate phá vỡ dữ liệu khi mở chi nhánh.
- **Auditability:** giao dịch đã thanh toán không bị sửa trực tiếp; hủy đơn, chuyển kho và duyệt công phải lưu người thực hiện, thời điểm và lý do.

### Ngôn ngữ giao diện
**Tiếng Việt toàn bộ.** Labels, thông báo, lỗi, toast, placeholder — đều bằng tiếng Việt. Tên field kỹ thuật (SKU, status) giữ nguyên dạng viết tắt phổ thông.

---

## 2. Design System

### Philosophy
Đen trắng. Cứng cáp. Không gradient, không màu sắc thương mại. Giống editorial magazine nhưng chạy trên iOS. Từng pixel phải có lý do tồn tại.

Tuy mang phong cách editorial (báo chí), nhưng trải nghiệm và tính dễ dùng (usability) phải mang **cảm giác của một native app**. Phân cấp thông tin (hierarchy) rõ ràng bằng typography, spacing và contrast thay vì màu sắc. Các yếu tố tương tác (button, tab, list item) phải có affordance rõ ràng, có trạng thái active/pressed để người dùng nhận biết ngay lập tức.

Cảm giác tham chiếu: **Supreme x Braun** — cứng về grid, mềm về type. Không phải flat boring, không phải skeuomorphic. Editorial precision với functional clarity.

### Signature Visual Rules (Quy tắc cứng)
- **Header App:** Luôn full ink (chữ trắng trên nền đen, không có màu nào khác) để phân tách cứng không gian điều hướng khỏi nội dung.
- **Top Indicator (Nav Tab):** Trạng thái active là một thanh `2px × 20px` đặt phía trên icon (không dùng dot hay underline kiểu iOS thông thường).
- **Price & SKU Font:** Luôn dùng **JetBrains Mono** (kể cả trong cart, order list). Không bao giờ dùng Inter cho số tiền để tạo rhythm đặc trưng.
- **Status "Đã bán":** Giảm opacity của toàn bộ card sản phẩm xuống `0.4` (cảm giác vật lý) thay vì chỉ đổi màu label.
- **Product Grid:** Ngăn cách nhau bằng `1px solid var(--rule)` không có gap (như trang báo chia column, không phải card grid padding thông thường).
- **Buttons:** Border radius tối đa `4-6px`. Cấm hoàn toàn pill button (ngoại trừ filter chips).

### Bảng màu
```
--color-ink:         #0A0A0A   /* Near-black — primary text, buttons, borders */
--color-paper:       #FAFAFA   /* Near-white — backgrounds */
--color-mid:         #888888   /* Medium gray — secondary text, placeholders */
--color-rule:        #E2E2E2   /* Light gray — dividers, borders */
--color-surface:     #F4F4F4   /* Off-white — cards, input backgrounds */
--color-inverse-bg:  #0A0A0A   /* Inverse backgrounds (admin header) */
--color-inverse-fg:  #FAFAFA   /* Inverse text */
--color-accent:      #0A0A0A   /* Accent = ink (monochrome system) */
--color-destructive: #D62828   /* Đỏ — chỉ dùng cho xóa, lỗi nghiêm trọng */
--color-success:     #1A7A4A   /* Xanh — chỉ dùng cho trạng thái thành công */
```

Dark mode: tự động qua `prefers-color-scheme`. Paper ↔ Ink đảo ngược. Destructive và success giữ nguyên.

### Typography
```
Display:   "Bebas Neue" — headlines, SKU code, số lớn. ALL CAPS, tracking wide.
Body:      "Inter" — toàn bộ nội dung đọc được. Weight 400/500 only.
Mono:      "JetBrains Mono" — SKU, mã hóa đơn, số tiền raw.
```

Type scale (mobile-first, rem base 16px):
```
--text-xs:    11px  /* Labels, timestamps, badges */
--text-sm:    13px  /* Secondary body, captions */
--text-base:  15px  /* Primary body */
--text-lg:    17px  /* Section headings */
--text-xl:    22px  /* Page titles */
--text-2xl:   32px  /* Dashboard numbers */
--text-display: 48px /* Hero stats, empty states */
```

### Spacing & Layout
```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px

--radius-sm:  6px
--radius-md:  10px
--radius-lg:  16px
--radius-full: 9999px

Safe area padding mobile: env(safe-area-inset-*)
Bottom navigation height: 56px + safe area
```

### Component Patterns
- **Mobile Navigation**: Luôn sử dụng **Bottom Navigation Bar** làm điều hướng chính trên mobile (ví dụ: POS, Đơn hàng, Chấm công), gắn chặt với mép dưới màn hình kèm `safe-area-inset-bottom` để thao tác tiện bằng một tay.
- **Cards**: `border: 1px solid var(--color-rule)`, `border-radius: var(--radius-lg)`, no shadow. Khoảng cách (spacing) các thành phần bên trong phải đủ thoáng để dễ đọc.
- **Buttons primary**: Ink bg, Paper text, full-width trên mobile. Các vùng bấm (touch target) luôn đảm bảo tối thiểu 44x44px theo chuẩn mobile-first.
- **Buttons secondary**: Paper bg, Ink border 1px, Ink text
- **Inputs**: `background: var(--color-surface)`, border chỉ hiện khi focus — clean appearance. Khung input đủ lớn để bấm trên điện thoại không bị trượt.
- **Badges**: Pill shape, monochrome. Status dùng outline style, không filled
- **Bottom sheet**: Slide up từ dưới cho forms trên mobile — không navigate sang page mới, hỗ trợ gesture vuốt xuống để đóng y hệt native app.
- **Haptic feedback**: `navigator.vibrate()` chỉ là progressive enhancement; mọi trạng thái luôn có visual feedback, toast và loading/disabled state
- **Skeleton loading**: Shimmer effect với Paper bg + Rule color

### UI/UX Rules & Anti-Template Checklist
- **Operational luxury**: Giao diện như công cụ vận hành chuyên nghiệp, ưu tiên tốc độ bán hàng và scan dữ liệu nhanh. Không dùng từ ngữ marketing dài dòng.
- **Không có "AI Feeling"**: Tránh bo góc quá lớn (`rounded-2xl`), shadow nhiều lớp, gradient, glow, hay minh họa SVG generic. 
- **Microcopy & Emoji**: Chỉ dùng text nghiệp vụ ngắn gọn ("Thêm đơn", "Ghi chi", "Hủy đơn"). Tuyệt đối không dùng emoji làm icon điều hướng hay trạng thái.
- **Feedback & Trạng thái**:
  - Loading dưới 1s: dùng skeleton card/row, không dùng spinner toàn màn hình.
  - Lỗi: đặt gần field, nói rõ cách sửa (ví dụ: "Giá bán phải lớn hơn 0").
  - Empty state: ngắn gọn, luôn có action trực tiếp (ví dụ: "Chưa có đơn hôm nay" kèm nút "Tạo đơn").

### Signature Visual Element
**Một đường kẻ ngang 1px** `var(--color-ink)` xuyên qua toàn bộ layout như thread kết nối từng section. Grid system strict với 8px baseline. Số tiền và SKU luôn in Bebas Neue — tạo ra nhịp visual giống editorial spread hơn là app store template. Dữ liệu số (tiền, tồn kho) luôn được căn phải hoặc dùng font tabular để dễ đọc và tránh nhảy layout.

---

## 3. Tech Stack

```
Frontend:    Next.js 16.x stable (App Router) + TypeScript, pin exact version trong lockfile
Styling:     Tailwind CSS + CSS custom properties
Animation:   Framer Motion (transitions nhẹ, không decoration)
State:       TanStack Query v5 (server state) + Zustand (client state)
Forms:       React Hook Form + Zod validation
PWA:         Service Worker thủ công hoặc Serwist — manifest, install prompt, asset/image caching
Icons:       Lucide React

Backend:     Supabase (Postgres + Auth + Realtime + Edge Functions)
Storage:     Cloudflare R2 (public product images + private invoice PDFs)
Deploy:      Vercel (Next.js) — CDN global, auto HTTPS
Notifications: DB outbox → server sender → Web Push; Realtime chỉ cập nhật UI đang mở
PDF:         Async job sau khi checkout commit; server/function render và upload private R2
Monitoring:  Sentry hoặc OpenTelemetry + Web Vitals
Testing:     Vitest + Playwright + pgTAP
```

### Performance Stack
```
Image optimization: resize client-side thành thumbnail 400–600px và detail 1200–1600px,
                    WebP, target ≤ 800KB/ảnh; tạo blurDataURL (base64 PNG) để dùng trực tiếp với Next.js <Image>
Product list:       cursor pagination 30–50 items + server-side search/filter
Virtual list:       chỉ thêm sau khi profiling chứng minh DOM là bottleneck
Prefetch:           TanStack Query prefetchQuery trên hover/focus
Optimistic update:  chỉ dùng cho mutation có rollback rõ; checkout không optimistic
Cache strategy:     staleTime 10–30 giây cho POS product list + Realtime invalidate
                    staleTime 0 cho attendance/realtime data
Bundle:             Dynamic import cho chart components; PDF renderer không nằm trong checkout client bundle
```

---

## 4. Database Schema

### Supabase Postgres — Full Schema

```sql
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

-- STORES (MVP có thể seed một store duy nhất)
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USERS (extends Supabase Auth)
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
  sku           TEXT UNIQUE NOT NULL,     -- VD: 2Q-BR-001, 2Q-RG-042
  name          TEXT NOT NULL,
  type          product_type NOT NULL,
  tier          product_tier NOT NULL DEFAULT 'standard',
  status        product_status NOT NULL DEFAULT 'in_stock',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  current_store_id UUID NOT NULL REFERENCES stores(id),
  base_price    NUMERIC(10,0) NOT NULL CHECK (base_price >= 0),
  length_mm     NUMERIC(6,1),             -- Chiều dài muỗng gốc (mm)
  weight_g      NUMERIC(6,2),             -- Khối lượng (gram)
  sold_at       TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reserved_until IS NULL OR status = 'reserved'),
  CHECK (sold_at IS NULL OR status IN ('sold', 'archived'))
);

-- PRODUCT IMAGES (multiple per product, unique pieces)
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,             -- R2 object key: {sku}/{timestamp}-{angle}.webp
  public_url  TEXT,                      -- Chỉ product image được phép public
  blur_data   TEXT,                      -- blurDataURL (base64 PNG) đã tạo khi upload
  width       INT CHECK (width > 0),
  height      INT CHECK (height > 0),
  angle       TEXT,                      -- 'front', 'back', 'side', 'detail'
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDERS (hóa đơn)
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE NOT NULL,  -- Generate từ DB sequence
  idempotency_key UUID UNIQUE NOT NULL,
  store_id        UUID NOT NULL REFERENCES stores(id),
  status          order_status NOT NULL DEFAULT 'pending', -- 'pending' chỉ tồn tại tạm thời trong transaction lúc chạy RPC, không bao giờ commit DB ở trạng thái này
  customer_name   TEXT,
  customer_phone  TEXT,
  payment_method  payment_method NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  subtotal        NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount        NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total           NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes           TEXT,
  invoice_r2_key  TEXT,                  -- Private object key, không lưu public URL
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

-- ATTENDANCE (chấm công)
CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     UUID NOT NULL REFERENCES profiles(id),
  store_id     UUID NOT NULL REFERENCES stores(id),
  shift_type   shift_type NOT NULL,
  shift_date   DATE NOT NULL,            -- Phải được cast sang giờ Việt Nam (Asia/Ho_Chi_Minh) khi insert/query
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  hours_worked NUMERIC(4,2),             -- Computed sau check-out
  base_pay     NUMERIC(10,0),            -- hourly_rate × hours_worked
  bonus        NUMERIC(10,0) NOT NULL DEFAULT 0,
  notes        TEXT,
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, store_id, shift_date, shift_type),
  CHECK (check_out IS NULL OR (check_in IS NOT NULL AND check_out >= check_in)),
  CHECK (hours_worked IS NULL OR hours_worked >= 0)
);

-- SHIFTS CONFIG (ca làm việc)
CREATE TABLE shift_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id),
  name         TEXT NOT NULL,            -- "Ca sáng", "Ca chiều", "Cả ngày"
  shift_type   shift_type NOT NULL,
  start_time   TIME NOT NULL,            -- 09:00
  end_time     TIME NOT NULL,            -- 15:00
  hours        NUMERIC(4,2) NOT NULL,    -- 6.0
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (store_id, shift_type)
);

-- Insert mặc định
-- Phải có file migration riêng (VD: 00_seed.sql) để tạo ít nhất 1 store mặc định và các ca làm việc tương ứng.

-- TRANSACTIONS (Thu Chi)
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_category AS ENUM ('sale', 'import', 'salary', 'other_expense', 'manual_income');

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

-- APPEND-ONLY INVENTORY AUDIT
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
```

### Timezone & Nguyên tắc truy vấn
- **Không dùng `created_at` để filter báo cáo ngày**: Server Vercel thường chạy giờ UTC, nên `created_at::date` có thể bị lệch múi giờ. 
- **Sử dụng `business_date`**: Các bảng như `orders`, `transactions` luôn có trường `business_date` kiểu `DATE` được cast trực tiếp từ giờ Việt Nam (`Asia/Ho_Chi_Minh`) ở DB. Toàn bộ query tính doanh thu, thu chi ngày/tháng phải dựa vào trường này.
- **Bảng Attendance**: `shift_date` cũng phải dùng mốc giờ VN để tránh nhân viên làm ca tối quá nửa đêm bị tính sai ngày. (Ví dụ: Ca từ 21:00 đến 02:00 hôm sau vẫn thuộc `shift_date` của ngày hôm trước).
- **Snapshot dữ liệu**: Mỗi sản phẩm ở hệ thống mới là 1 món unique (`quantity = 1`). Tuy nhiên, `order_items` vẫn lưu lại `sale_price` để đảm bảo nếu giá gốc bị admin sửa sau này, doanh thu hóa đơn cũ không bị ảnh hưởng.
- **Không xoá cứng**: Đơn hàng bị hủy chỉ đổi status thành `cancelled`, lưu lại người hủy, thời gian, lý do và tự động tạo `inventory_movements` hoàn kho.

### Transactional command boundary

Client không được ghi trực tiếp vào `orders`, `order_items`, trạng thái bán của `products`, các cột tính toán của `attendance`, `inventory_movements`, `invoice_jobs` hoặc `notification_outbox`. Các workflow quan trọng đi qua RPC/server command duy nhất:

**`checkout_order(p_store_id, p_items, p_discount, p_payment_method, p_customer, p_idempotency_key)`** chạy trong một database transaction:
1. Xác thực user active và thuộc store; nếu `idempotency_key` đã tồn tại thì trả lại order cũ.
2. Lock tất cả product theo thứ tự ổn định bằng `SELECT ... FOR UPDATE` để tránh deadlock.
3. Kiểm tra product còn `in_stock`, **đã được duyệt** (`approval_status = 'approved'`), thuộc đúng store, không trùng trong payload.
4. Kiểm tra `sale_price >= 0`. (Lưu ý: Cho phép `sale_price = 0` dành cho hàng tặng, nhưng cần flag `require_confirmation` ở client và ghi log). Tính `subtotal`, `discount`, `total`, `created_by`, `paid_at` và `order_number` ở database; không tin giá trị tổng từ client.
5. Insert order + items, đổi product thành `sold`, set `sold_at`, ghi `inventory_movements` loại `sale`.
6. Tự động ghi 1 dòng vào bảng `transactions` (Thu - `income`, loại `sale`) dựa trên tổng thanh toán.
7. Tạo notification/recipients, `notification_outbox` và `invoice_jobs` trong cùng transaction.
8. Commit rồi mới trả order. Bất kỳ bước nào lỗi thì rollback toàn bộ và trả mã lỗi ổn định (`PRODUCT_UNAVAILABLE`, `STORE_FORBIDDEN`, `INVALID_DISCOUNT`, ...).

**`clock_in(p_store_id, p_shift_type)` / `clock_out(p_attendance_id)`** dùng `now()` tại database. Staff không gửi được `check_in`, `check_out`, `hours_worked`, `base_pay`, `bonus`, `approved_by` hoặc `approved_at`. `clock_out` tính giờ/lương từ dữ liệu server; admin duyệt hoặc điều chỉnh bằng RPC riêng có audit reason.

**`create_product(...)`** dùng chung cho Admin/Staff. Nếu caller là Staff, RPC tự động set `approval_status = 'pending'`. Nếu là Admin, set `approval_status = 'approved'`.
**`update_product_metadata(...)`, `set_product_reservation(...)`** là admin commands; không cho direct update `status`, `current_store_id`, `sold_at` hoặc `reserved_until` từ client.

**`transfer_product(p_product_id, p_to_store_id, p_reason)`** lock product, cập nhật `current_store_id` và append một `inventory_movements` trong cùng transaction.

**`cancel_order(p_order_id, p_reason)`** chỉ dành cho admin. **Cần lock order, sau đó lock products theo đúng thứ tự (ORDER BY product_id)** tương tự `checkout_order` để tránh deadlock. Chuyển order sang `cancelled`, ghi actor/time/reason và tự động tạo `inventory_movements` (loại `return`) để hoàn kho. Không update/delete order đã paid trực tiếp.

**`mark_notification_read(p_notification_id)`** chỉ set `read_at` trên recipient của `auth.uid()`; client không update `delivered_at` hoặc `push_status`.

SKU và order number phải dùng database sequence/function, không dùng “đọc max + 1” từ client.

### Cron Jobs & Workers
- **Reservation Cleanup**: Chạy Vercel Cron mỗi 15 phút. Quét các products có `reserved_until < NOW()` và `status = 'reserved'`. Trả về `in_stock`, set `reserved_until = NULL`, ghi `inventory_movements` (loại `return`).
- **Notification & Invoice Workers**: Có retry logic (Exponential backoff). Nếu `attempts >= 3` thì chuyển status thành `failed` (Dead-letter). Worker endpoint dùng cho Cron phải verify request header `Authorization: Bearer {CRON_SECRET}`.

### Row Level Security (RLS)

```sql
-- Enable RLS
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

-- SECURITY DEFINER helpers ở private schema, lock search_path và không expose qua Data API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active = TRUE
$$;

-- Read policies. Admin write thực hiện bằng policy rõ ràng hoặc command server/RPC.
CREATE POLICY "profiles_read_self_or_admin" ON profiles FOR SELECT USING (
  id = (SELECT auth.uid()) OR private.get_user_role() = 'admin'
);
CREATE POLICY "profiles_admin_write" ON profiles FOR ALL
  USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "stores_authenticated_read" ON stores FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "stores_admin_write" ON stores FOR ALL
  USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "staff_stores_read_self_or_admin" ON staff_stores FOR SELECT USING (
  staff_id = (SELECT auth.uid()) OR private.get_user_role() = 'admin'
);
CREATE POLICY "staff_stores_admin_write" ON staff_stores FOR ALL
  USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "products_authenticated_read" ON products FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "images_authenticated_read" ON product_images FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
-- Product/image writes đi qua admin commands để bảo vệ status, store và object metadata.

CREATE POLICY "orders_read_self_or_admin" ON orders FOR SELECT USING (
  created_by = (SELECT auth.uid()) OR private.get_user_role() = 'admin'
);
CREATE POLICY "items_read_through_order" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND
    (o.created_by = (SELECT auth.uid()) OR private.get_user_role() = 'admin'))
);
-- Không có INSERT/UPDATE/DELETE policy cho orders/items: checkout/cancel RPC là write boundary.

CREATE POLICY "attendance_read_self_or_admin" ON attendance FOR SELECT USING (
  staff_id = (SELECT auth.uid()) OR private.get_user_role() = 'admin'
);
-- Không có direct write policy cho staff; clock_in/clock_out RPC kiểm soát từng cột.

CREATE POLICY "shift_authenticated_read" ON shift_config FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "shift_admin_write" ON shift_config FOR ALL
  USING (private.get_user_role() = 'admin') WITH CHECK (private.get_user_role() = 'admin');

CREATE POLICY "notification_read_recipient" ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM notification_recipients nr
    WHERE nr.notification_id = id AND nr.user_id = (SELECT auth.uid()))
);
CREATE POLICY "recipient_read_own" ON notification_recipients FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "push_subscription_own" ON push_subscriptions FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "inventory_admin_read" ON inventory_movements FOR SELECT USING (private.get_user_role() = 'admin');
-- LƯU Ý: inventory_movements và transactions chỉ có policy READ cho admin, tuyệt đối không có write policy cho client (việc ghi hoàn toàn thông qua RPC).
CREATE POLICY "transactions_admin_read" ON transactions FOR SELECT USING (private.get_user_role() = 'admin');

-- products/images/orders/items/attendance/notifications/recipients/inventory/transactions/jobs/outbox không có client write policy.
-- Service role chỉ tồn tại ở server; không bao giờ đưa SUPABASE_SERVICE_ROLE_KEY xuống browser.
```

Migrations phải revoke table privileges không cần thiết khỏi `anon`/`authenticated`, rồi grant tối thiểu theo policy. pgTAP phải chứng minh staff không thể giả `created_by`, chèn item vào order khác, sửa cột lương, đọc đơn người khác, hoặc đọc notification không thuộc mình. Mọi `SECURITY DEFINER` phải `SET search_path = ''`, schema-qualify object, revoke execute mặc định và chỉ grant RPC cần thiết cho `authenticated`.

---

## 5. SKU Convention

Format: `2Q-{TYPE}-{NUMBER}`

```
Loại          Prefix    Ví dụ
──────────────────────────────
Vòng tay      BR        2Q-BR-001
Nhẫn          RG        2Q-RG-042
Hoa tai       EA        2Q-EA-015
Vòng cổ       NK        2Q-NK-008
Vòng chân     AK        2Q-AK-003
Khác          OT        2Q-OT-099
```

SKU auto-generate khi tạo sản phẩm dựa trên type + sequence number từ DB. Admin có thể override thủ công.

**Giá gợi ý theo tier:**
```
Premium (hàng xịn):  700,000 VNĐ base price
Standard (thường):   500,000 VNĐ base price
```
Giá này là default, editable lúc tạo đơn hàng.

---

## 6. Cloudflare R2 — Storage Architecture

### Bucket structure
```
bucket: 2q-studio-prod/
  products/
    {sku}/
      {image_id}-thumb.webp        — 400–600px, list/grid
      {image_id}-medium.webp       — 1200–1600px, detail
  invoices/
    {yyyy}/{mm}/{order_id}.pdf     — Private; chỉ truy cập bằng signed GET URL
  avatars/
    {user_id}.webp                — Private hoặc authenticated proxy
```

### Upload flow (không qua server)
```
1. Client chọn ảnh từ camera / gallery
2. Client validate MIME/dimension, xoay theo EXIF, tạo thumb + medium WebP và blur placeholder; mỗi file ≤ 800KB
3. Client gọi Next.js API route: POST /api/upload/presign
   → Server verify auth/role, allowlist content type + object prefix, generate presigned URL TTL ngắn
4. Client PUT thẳng lên R2 qua presigned URL
5. Client gọi authenticated server command để verify object tồn tại và lưu `r2_key`, dimensions, blur data
6. Object lỗi/orphan được scheduled cleanup xóa sau thời gian an toàn
```

### Retention và access policy
- **Không xóa ảnh sản phẩm đã bán sau 7 ngày.** Ảnh là bằng chứng giao dịch, hỗ trợ khiếu nại và đối soát.
- R2 lifecycle chỉ dùng điều kiện được hỗ trợ như prefix; không thiết kế dựa trên object tag.
- Nếu cần tối ưu storage sau này, scheduled cleanup chọn record theo DB (`sold_at` + retention tối thiểu được business duyệt), xóa object rồi mới cập nhật record; job phải idempotent và có audit log.
- Product image có thể public qua custom domain/CDN. Invoice bucket/prefix luôn private.
- Database chỉ lưu `invoice_r2_key`. `GET /api/invoices/{id}/download` kiểm tra admin hoặc owner của order rồi trả signed GET URL TTL ngắn.
- Upload presign không nhận object key tùy ý từ client; server sinh key để chặn overwrite/path traversal logic.

---

## 7. App Architecture

### Route Structure (Next.js App Router)

```
app/
  (auth)/
    login/                    — Trang đăng nhập (email + password)

  (authenticated)/
    admin/                    — URL namespace /admin/*, admin sidebar
      layout.tsx
      page.tsx                — Dashboard
      products/
        page.tsx
        new/page.tsx
        [id]/page.tsx
      orders/
        page.tsx
        [id]/page.tsx
      staff/
        page.tsx
        [id]/page.tsx
      attendance/page.tsx
      stores/page.tsx
      settings/page.tsx

    staff/                    — URL namespace /staff/*, staff mobile layout
      layout.tsx
      pos/page.tsx
      products/
        page.tsx
        [id]/page.tsx
      orders/
        page.tsx
        [id]/page.tsx
      attendance/page.tsx
      profile/page.tsx

  api/
    upload/presign/route.ts   — Generate R2 presigned URL
    invoices/[id]/download/route.ts — Authorize + signed GET URL cho private PDF
    jobs/invoices/route.ts    — Authenticated cron/queue worker endpoint
    jobs/notifications/route.ts — Consume notification outbox, gửi Web Push

  manifest.ts                 — PWA manifest
public/
  sw.js                       — Service Worker thủ công/Serwist, served tại /sw.js
```

Route group `(admin)` hoặc `(staff)` không tạo URL segment. Vì vậy các page trùng tên bên trong hai group sẽ conflict. Blueprint dùng segment thật `/admin/*` và `/staff/*`; middleware/layout chỉ là defense-in-depth, quyền dữ liệu vẫn do RLS/RPC enforce.

### Component Structure

```
components/
  ui/                         — Base design system components
    Button.tsx
    Input.tsx
    Badge.tsx
    Card.tsx
    Sheet.tsx                 — Bottom sheet (mobile)
    Skeleton.tsx
    Avatar.tsx
    Toast.tsx

  products/
    ProductCard.tsx           — Card trong grid danh sách
    ProductForm.tsx           — Form thêm/edit sản phẩm
    ImageUploader.tsx         — Multi-image upload với preview
    StatusBadge.tsx           — in_stock / sold / reserved
    SKUDisplay.tsx            — Mono font SKU badge

  orders/
    OrderForm.tsx             — Tạo đơn hàng
    OrderItem.tsx             — Dòng item trong đơn
    PriceEditor.tsx           — Editable price per item
    InvoiceStatus.tsx         — pending / ready / failed + retry affordance
    PaymentModal.tsx          — Chọn phương thức + confirm

  attendance/
    ClockInOut.tsx            — Nút chấm công với shift selector
    AttendanceRow.tsx         — Dòng trong bảng chấm công
    ShiftBadge.tsx            — Ca sáng / Ca chiều / Cả ngày

  layout/
    AdminSidebar.tsx
    StaffBottomNav.tsx
    NotificationBell.tsx
    PageHeader.tsx

  dashboard/
    RevenueCard.tsx           — Số liệu doanh thu
    RecentOrders.tsx
    StockSummary.tsx
```

### 7.5 Navigation (Mobile Bottom Tab)
Là thành phần điều hướng chính cho thiết bị di động (Staff view), gắn sát đáy màn hình.

| Tab | Icon Lucide | Route | Mục đích |
|---|---|---|---|
| Bán hàng | `ShoppingCart` | `/staff/pos` | Màn hình POS tạo đơn |
| Đơn hàng | `Receipt` | `/staff/orders` | Xem đơn của mình hôm nay để đối soát |
| Chấm công| `Clock` | `/staff/attendance`| Check-in / out ca làm việc |
| Cá nhân | `User` | `/staff/profile` | Xem profile, doanh thu cá nhân |

**Quy tắc tab bar:**
- Giới hạn 4 tab trên MVP.
- Không đưa trang `/admin` vào tab bar để tránh staff ấn nhầm.
- Mỗi tab có hit area tối thiểu 44x44px. Icon nét đều (1.5px - 2px) kèm text label siêu nhỏ ở dưới để rõ ràng.

---

## 8. Feature Specifications

### 8.1 Quản lý Sản phẩm

**Thêm sản phẩm mới (Staff & Admin)**
- Cả Staff và Admin đều có thể thêm sản phẩm mới. Tuy nhiên, sản phẩm do Staff tải lên mặc định có trạng thái `approval_status = 'pending'`, không được phép bán ngay.
- Sản phẩm do Admin thêm mặc định là `approved` và có thể bán ngay.
- Tự động generate SKU dựa trên type được chọn (editable).
- Upload 1–4 ảnh: front, back, side, detail (Resize + compress ảnh client-side trước khi upload). Bắt buộc có Rate Limit trên API xin presign URL (VD: max 20 requests/user/phút) để chống abuse storage.
- Fields: SKU, Tên sản phẩm, Loại (dropdown), Tier (Premium/Standard), Giá gốc (auto-fill theo tier, editable), Chiều dài (mm), Khối lượng (g), Ghi chú.

**Duyệt sản phẩm (Admin Only)**
- Giao diện dạng list/grid dành riêng cho Admin để xem các sản phẩm đang `pending`.
- Cho phép duyệt hàng loạt (bulk approve) bằng checkbox hoặc bấm vào từng cái để chỉnh sửa (tên, giá gốc, loại) trước khi ấn "Approve" / "Reject".
- Chỉ khi sản phẩm được duyệt (`approved`), nó mới xuất hiện trên màn hình POS của Staff để bán.

**Danh sách sản phẩm**
- Grid 2 cột (mobile) / 3–4 cột (tablet+)
- Filter server-side: Store, Loại, Tier, Trạng thái
- Search: SKU, tên
- Cursor pagination 30–50 item/lần; UI có thể dùng “Tải thêm” hoặc infinite scroll trên cursor
- Lazy load ảnh với blur placeholder được tạo thật lúc upload
- Realtime status change chỉ invalidate/refetch query; checkout transaction vẫn là lớp chống bán trùng

**Cập nhật trạng thái**
- Từ chi tiết sản phẩm: toggle nhanh `Còn hàng` ↔ `Đã đặt` ↔ `Đã bán`
- Chuyển sang `Đã bán` chỉ xảy ra trong checkout RPC; không cho toggle thủ công bypass order
- Reserve/unreserve qua command có `reserved_until`; hết hạn được job idempotent giải phóng
- Chuyển store qua `transfer_product()` và luôn append inventory movement

### 8.2 Tạo Đơn hàng & POS

**Màn hình POS (Staff)**
- **Layout Mobile-first**: Chia 3 vùng rõ ràng:
  1. **Header/Filter (sticky top)**: Tìm kiếm SKU, Lọc sản phẩm.
  2. **Danh sách sản phẩm**: Grid các sản phẩm `Còn hàng` (ảnh to, dễ chạm). Sản phẩm hết hàng bị giảm emphasis (mờ đi) và không bấm được nhưng vẫn hiển thị để staff biết.
  3. **Order Summary (sticky bottom)**: Giỏ hàng thu gọn và nút "Xác nhận đơn" (Primary CTA) luôn nằm trong vùng ngón cái (thumb zone), không bị bottom nav che khuất.
- Add vào giỏ hàng
- Mỗi item: **giá bán editable** tại thời điểm tạo đơn
  - Default: base_price của sản phẩm
  - Staff được phép sửa giá (trường số, bàn phím số lớn trên mobile)
- Tổng tiền auto-tính
- Discount field (số tiền, không phải %)
- Thông tin khách: Tên, SĐT (optional)
- Phương thức thanh toán: Tiền mặt / Chuyển khoản / MoMo / VNPay
- Client tạo `idempotency_key`, gửi item IDs + sale prices + discount tới `checkout_order()`
- Server lock/revalidate products và tính lại toàn bộ totals trong một transaction
- Double tap/retry cùng `idempotency_key` phải trả cùng order, không tạo order thứ hai
- Khi mất mạng: disable thanh toán, giữ cart theo user/store và hiển thị “Mất kết nối”; không queue checkout offline trong MVP
- Checkout commit thành công → trả order ngay; PDF và push chạy async, không chặn thanh toán

**Hóa đơn PDF**
- Template: đen trắng, logo 2Q Nhẫn Thuật
- Nội dung: Số đơn, Ngày, Danh sách items + giá bán, Tổng, PT thanh toán, Tên khách
- Worker đọc `invoice_jobs`, render PDF rồi lưu private R2 `invoices/{yyyy}/{mm}/{order_id}.pdf`
- UI hiển thị `Đang tạo` / `Sẵn sàng` / `Tạo lỗi`; retry job không tạo lại order
- Download/share qua endpoint authorize + signed GET URL TTL ngắn; không lưu public URL

**Notifications khi thanh toán xong**
- Transaction tạo một `notifications` record, recipient riêng cho từng user và một outbox record
- Worker claim outbox idempotently, gửi tới mọi active device subscription và ghi delivery status
- `notification_recipients.read_at` là per-user; đọc broadcast không ảnh hưởng user khác
- Realtime cập nhật bell/toast khi app đang mở; Web Push là kênh riêng khi app đóng

### 8.3 Chấm công & Tính lương

**Staff tự chấm công & Báo cáo cá nhân**
- Màn hình chấm công: chọn ca (sáng / chiều / cả ngày)
- Check in/out chỉ gọi RPC; timestamp lấy từ database `now()`, không lấy từ thiết bị
- RPC xác thực staff active, thuộc store, ca hợp lệ; check-out tính `hours_worked` và `base_pay`
- Không thể check in 2 lần cùng ngày cùng ca
- Hiển thị trạng thái hôm nay: chưa chấm / đang làm / đã kết thúc
- Staff không thể gửi/sửa `hours_worked`, `base_pay`, `bonus`, `approved_by`, `approved_at`
- **Báo cáo cá nhân**: Nhân viên chỉ xem được tổng số đơn và tổng tiền bán của **chính họ trong ngày hôm nay** (dùng cho việc bàn giao ca/chốt sổ). Không xem được doanh thu toàn shop hay báo cáo của người khác.

**Ca làm việc mặc định**
```
Ca sáng:   09:00 – 15:00  (6 tiếng)
Ca chiều:  15:00 – 21:00  (6 tiếng)
Cả ngày:   09:00 – 21:00  (12 tiếng)
```
Admin có thể thêm/sửa ca trong Settings.

**Tính lương (Admin)**
- Xem bảng chấm công theo tháng / nhân viên
- `base_pay = hourly_rate × hours_worked`
- Admin có thể thêm `bonus` thủ công qua command có audit reason
- Export bảng lương tháng (PDF hoặc in trực tiếp)
- Approve/reject từng ngày chấm công

### 8.4 Thu & Chi (Income & Expense)
- **Ghi thu tự động**: Khi thanh toán xong đơn POS, hệ thống tự động ghi 1 khoản Thu (`income`, danh mục `sale`).
- **Ghi chi thủ công**: Chỉ Admin hoặc người được cấp quyền mới có thể ghi Chi (tiền nhập hàng, chi phí vận hành như ship, điện nước). Nhập qua Bottom Sheet gọn gàng trên mobile.
- Giao diện có tổng thu, tổng chi và chênh lệch theo ngày/tuần/tháng, dựa trên `business_date` (giờ VN).

### 8.5 In Bill (Fallback đa nền tảng)
- **In Browser (Primary Fallback)**: Gọi `window.print()` dùng CSS print media, in được trên mọi thiết bị. Preview bill đầy đủ thông tin: Logo, ngày giờ, nhân viên, sản phẩm, tổng tiền.
- **Bluetooth ESC/POS (Phase 3+)**: Chỉ hoạt động trên Chrome/Android hỗ trợ Web Bluetooth API. iOS/Safari không hỗ trợ. Nên đánh dấu rõ đây là optional.
- **PDF Invoice**: Chạy server-side sau khi checkout như đã định nghĩa ở phần trước.

### 8.6 Dashboard (Admin only)

**Tổng quan**
- Doanh thu hôm nay / tuần này / tháng này
- Số đơn hàng hôm nay
- Số sản phẩm còn hàng / đã bán
- Top 3 sản phẩm bán chạy theo loại

**Lịch sử đơn hàng**
- Table với filter: ngày, nhân viên, trạng thái, phương thức thanh toán
- Click vào đơn: xem chi tiết + re-download PDF

**Quản lý nhân viên**
- List nhân viên active
- Xem profile: thông tin, lịch sử chấm công, tổng lương tháng
- Thêm/disable tài khoản nhân viên
- Set hourly_rate

### 8.7 Phân quyền (RBAC)

| Tính năng                   | Admin | Staff |
|-----------------------------|:-----:|:-----:|
| Xem danh sách sản phẩm      | ✓     | ✓     |
| Thêm sản phẩm (Chờ duyệt)   | ✓     | ✓     |
| Cập nhật/Xoá sản phẩm       | ✓     | ✗     |
| Upload ảnh sản phẩm         | ✓     | ✓     |
| Duyệt sản phẩm (Approve)    | ✓     | ✗     |
| Chuyển kho (`transfer_product`) | ✓     | ✗     |
| Tạo đơn hàng                | ✓     | ✓     |
| Xem tất cả đơn hàng         | ✓     | ✗     |
| Xem đơn của mình            | ✓     | ✓     |
| Huỷ / sửa đơn đã tạo        | ✓     | ✗     |
| Ghi Chi (Expense) thủ công  | ✓     | ✗     |
| Xem doanh thu/thu chi tổng  | ✓     | ✗     |
| Chấm công                   | ✓     | ✓     |
| Xem bảng chấm công tất cả   | ✓     | ✗     |
| Approve chấm công           | ✓     | ✗     |
| Quản lý nhân viên           | ✓     | ✗     |
| Cấu hình ca, giá tier       | ✓     | ✗     |
| Nhận push notification      | ✓     | ✓ (của mình) |

---

## 9. PWA Configuration

### Manifest (`/app/manifest.ts`)
```typescript
{
  name: "2Q Studio",
  short_name: "2Q",
  description: "Quản lý cửa hàng trang sức 2Q Nhẫn Thuật",
  start_url: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#0A0A0A",
  theme_color: "#0A0A0A",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}
```

### Service Worker Strategy

| Resource | Strategy |
|----------|----------|
| JS/CSS có content hash | `CacheFirst` |
| Fonts/icons versioned | `CacheFirst` |
| Navigation/HTML | `NetworkFirst` với timeout + offline shell |
| Product image | `StaleWhileRevalidate` |
| Product catalog read-only | `NetworkFirst`; cache chỉ để browse khi offline |
| Orders, attendance, dashboard, invoice | `NetworkOnly`; không đưa vào shared runtime cache |
| `sw.js` | `Cache-Control: no-cache, no-store, must-revalidate` |

- Cache name chứa app version; hiển thị “Có phiên bản mới — tải lại” trước khi activate update có breaking change.
- Xóa toàn bộ user-scoped cache và Zustand persisted cart khi logout/chuyển user; cart key phải gồm `user_id + store_id`.
- Không cache response có doanh thu, khách hàng, chấm công hoặc signed invoice URL.
- MVP không checkout/chấm công offline. Background Sync không phải dependency bắt buộc.

### Web Push Notifications
```
Trigger:  Transaction → notification outbox → authenticated worker → Web Push API
Events:
  - order_paid:       "Đơn {order_number} đã thanh toán — {total}đ"
  - order_created:    "Đơn mới từ {staff_name}" (admin only)
  - attendance_approved: "Ca {date} đã được duyệt" (staff nhận)
  - stock_low:        "Sắp hết hàng loại {type}" (admin only)

Provider: VAPID keys tự host qua Next.js API route
Storage:  Push subscriptions lưu trong Supabase table push_subscriptions
```

Một user có nhiều subscription theo device. Endpoint hết hạn (`404/410`) phải set `revoked_at`; sender retry có backoff và idempotency. Push payload không chứa dữ liệu khách hàng hoặc thông tin nhạy cảm trên lock screen.

---

## 10. Performance Checklist

### Data Fetching
- [ ] TanStack Query với `staleTime` hợp lý cho từng loại data
- [ ] POS product list `staleTime` 10–30 giây + Realtime invalidate; checkout vẫn revalidate trong DB transaction
- [ ] Optimistic update chỉ cho thao tác reversible; không optimistic checkout/chấm công
- [ ] Prefetch sản phẩm detail khi hover card trong list
- [ ] Cursor pagination 30–50 item/lần; infinite scroll chỉ là UI trên pagination contract
- [ ] Join query đúng cách — 1 query lấy products + primary image, không N+1
- [ ] Load test concurrent checkout cùng một product: chính xác một request thành công

### Images
- [ ] Client-side resize/compress: thumb 400–600px, detail 1200–1600px, target ≤ 800KB
- [ ] WebP format cho tất cả ảnh sản phẩm
- [ ] Tạo và lưu blurhash/`blurDataURL` thực lúc upload
- [ ] Lazy load ảnh ngoài viewport
- [ ] R2 serve qua Cloudflare CDN — edge cache tại Hà Nội

### Mobile
- [ ] Chỉ thêm virtualization sau profiling; giữ keyboard navigation/accessibility hoạt động
- [ ] Bottom sheet thay vì page navigation cho forms nhanh
- [ ] Touch targets tối thiểu 44×44px
- [ ] `safe-area-inset` padding cho notch và home bar iOS
- [ ] Visual/toast/loading feedback luôn có; haptic chỉ progressive enhancement
- [ ] `font-display: swap` cho custom fonts
- [ ] Reduce motion support (`prefers-reduced-motion`)

### Bundle
- [ ] Dynamic import: PDF renderer, chart components
- [ ] Tree-shaking Lucide icons (import từng icon, không import *)
- [ ] Next.js Image optimization bật
- [ ] Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms

### Security & Reliability
- [ ] pgTAP kiểm thử RLS/RPC cho admin, staff, anonymous và user bị disable
- [ ] Vitest cho totals, discount, state transition và idempotency mapping
- [ ] Playwright cho checkout, retry/double-submit, clock in/out, signed invoice download và logout cache purge
- [ ] CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`; rate limit login/presign/worker endpoints
- [ ] Structured logs có request ID, actor ID, store ID và error code; không log PII/secrets
- [ ] Supabase PITR/backups theo plan, R2 retention, restore drill và runbook cho failed jobs

---

## 11. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-only

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=2q-studio-prod
NEXT_PUBLIC_R2_PUBLIC_URL=        # https://pub-xxx.r2.dev hoặc custom domain

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@2qnhanthat.com

# Internal jobs / cron
CRON_SECRET=
INVOICE_SIGNED_URL_TTL_SECONDS=300

# App
NEXT_PUBLIC_APP_URL=https://studio.2qnhanthat.com
```

---

## 12. Folder Structure

```
2q-studio/
├── app/
│   ├── (auth)/
│   ├── (authenticated)/
│   │   ├── admin/             — URL /admin/*
│   │   └── app/               — URL /app/*
│   ├── api/
│   ├── globals.css
│   ├── layout.tsx
│   └── manifest.ts
├── components/
│   ├── ui/
│   ├── products/
│   ├── orders/
│   ├── attendance/
│   ├── dashboard/
│   └── layout/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          — Browser client
│   │   ├── server.ts          — Server component client
│   │   └── proxy.ts           — Supabase session helper cho Next.js proxy
│   ├── r2/
│   │   ├── client.ts          — S3 client config
│   │   └── presign.ts         — Presigned URL generator
│   ├── pdf/
│   │   └── invoice.tsx        — Server-side invoice template
│   ├── push/
│   │   └── notify.ts          — Web Push sender
│   └── utils/
│       ├── currency.ts        — VNĐ formatter
│       └── date.ts            — Date/time helpers (vi-VN locale)
├── hooks/
│   ├── useProducts.ts
│   ├── useOrders.ts
│   ├── useAttendance.ts
│   ├── useNotifications.ts
│   └── useAuth.ts
├── stores/
│   ├── cart.ts                — Zustand: cart scoped theo user_id + store_id
│   └── ui.ts                  — Zustand: sidebar, sheet state
├── types/
│   └── database.ts            — Supabase generated types
├── public/
│   ├── icons/
│   └── sw.js                  — Service worker entry
├── supabase/
│   ├── migrations/            — Schema, RLS, RPC, grants
│   └── tests/                 — pgTAP security + transaction tests
└── proxy.ts                   — Session/route redirect; không thay thế RLS
```

---

## 13. Implementation Plan & Build Rules

Mục tiêu là build nhanh theo từng lát nhỏ (slices), mỗi lát có UI rõ ràng, test rõ ràng, tránh làm cả module lớn rồi mới debug.

### 13.1 Quy ước build
- **Thứ tự ưu tiên**: Schema → Seed data → Server Action/RPC → UI Component → Page Integration → Manual Test.
- **Tiền tệ**: Tiền luôn format ở UI bằng helper chung, database chỉ lưu kiểu `NUMERIC` hoặc `INTEGER` không có dấu phẩy.
- **Lỗi & Trạng thái**: Mọi mutation quan trọng phải bắt lỗi và trả về an toàn, không throw thẳng ra UI làm sập app (hiển thị Toast/Error Message).

### 13.2 Definition of Done cho mỗi Slice
- Code chạy không có lỗi TypeScript / Linter.
- Empty/Loading/Error state có UI đầy đủ và rõ ràng.
- Các API / RPC liên quan đến `orders`, `inventory_movements`, `transactions`, `attendance` phải có audit trail (lưu người thực hiện, thời gian, lý do nếu hủy/sửa).
- Mọi truy vấn doanh thu/báo cáo phải dùng `business_date` để không bị lệch timezone.
- Giao diện không bị horizontal scroll ở màn hình điện thoại (375px).

### 13.3 Các Phase chính
- **Phase 1 (Foundation & POS)**: Setup Next.js, Supabase Schema, Auth, Quản lý sản phẩm, và màn hình POS cơ bản (bán hàng, tính tiền, trừ kho).
- **Phase 2 (Thu Chi & Chấm công)**: Màn hình Thu Chi (transactions), tính lương cơ bản, dashboard cho nhân viên xem số cá nhân.
- **Phase 3 (Báo cáo & In ấn)**: Biểu đồ admin, export data, In Bill (Browser/Bluetooth), Notifications.

---

## 14. Key Decisions Log
| Quyết định | Lý do |
|------------|-------|
| PWA thay vì Native iOS | Multi-device (admin desktop + staff mobile), deploy instant, không cần App Store |
| Tiếng Việt | Staff là người Việt, giảm cognitive load, UX tự nhiên hơn |
| Cloudflare R2 cho file | Product image public/cacheable; invoice private qua signed URL |
| Supabase Pro | No project pause, daily backup, 100GB DB |
| Vercel deploy | Git push là xong, CDN global, Next.js native support |
| Giá editable lúc bán | Trang sức unique, giá negotiate tại điểm bán là phổ biến |
| Cursor pagination trước virtualization | Giảm query/DOM cost, ít complexity và giữ accessibility; chỉ virtualize theo metrics |
| Transactional checkout | Row lock + idempotency ngăn bán trùng và double submit trên nhiều thiết bị |
| Online-first MVP | Không checkout/chấm công offline; tránh conflict tồn kho và giờ công không kiểm soát |
| Giữ ảnh sold theo retention | Hỗ trợ đối soát/khiếu nại; không dựa vào lifecycle object tag |
| Multi-store trong schema | Chạy một store ở MVP nhưng không tạo migration phá vỡ dữ liệu khi mở rộng |
| RLS + RPC write boundary | Client chỉ đọc dữ liệu được cấp; workflow nhạy cảm do database quyết định |
| Monochrome design | Brand identity 2Q — craftsmanship, not commercial; đen trắng = editorial |

---

## 15. MVP Definition of Done

MVP chỉ được coi là sẵn sàng production khi các tiêu chí sau chạy tự động trong CI/staging:

### Data integrity
- Hai user checkout đồng thời cùng một product: đúng một transaction thành công; request còn lại nhận `PRODUCT_UNAVAILABLE` và không tạo dữ liệu rác.
- Retry/double tap cùng `idempotency_key`: trả cùng `order.id`; chỉ có một order, một tập order items, một sale movement và một invoice job.
- Totals lưu trong DB được tính từ item prices hợp lệ; client sửa `subtotal/total/created_by/paid_at` không có tác dụng.
- SKU và order number không trùng khi tạo song song.
- Transfer, cancellation, attendance approval và bonus adjustment có actor, timestamp và reason trong audit trail.

### Authorization
- Anonymous không đọc được business table.
- Staff chỉ đọc order/attendance/notification của mình và không thể direct-write bảng nhạy cảm.
- Staff không thể thao tác store mình không thuộc; admin có quyền theo RBAC đã công bố.
- Disabled user không gọi được command, presign upload hoặc đăng ký push mới.
- Invoice không có public URL; signed URL hết hạn và endpoint từ chối user không sở hữu order.

### PWA and operations
- Offline banner xuất hiện trong ≤ 1 giây sau khi mất mạng; checkout và clock in/out bị disable với thông báo rõ.
- Service worker update không giữ HTML cũ vô hạn; logout xóa cache/cart user-scoped.
- Invoice/push worker retry có backoff, giới hạn attempts, quan sát được failed state và không duplicate side effects.
- Backup restore được diễn tập trên staging; secret không xuất hiện trong client bundle hoặc logs.
- Critical flow đạt target accessibility cơ bản: keyboard, focus visible, touch target ≥ 44px, contrast và reduced motion.

### Out of scope của MVP
- Checkout hoặc chấm công offline, conflict resolution và Background Sync outbox phía client.
- Tự động xóa ảnh sold theo thời gian ngắn.
- Virtualization trước khi có performance profile chứng minh cần thiết.
- Native iOS/Android app, multi-currency, kế toán/thuế đầy đủ và tích hợp payment gateway reconciliation.

---

*Blueprint version 1.1 — 2Q Nhẫn Thuật Internal System*
*Cập nhật theo security/concurrency/PWA assessment tháng 06/2026*
