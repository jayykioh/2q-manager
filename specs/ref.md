# INNOIR Manager — Product Blueprint

> Hệ thống quản lý thu ngân & vận hành nội bộ cho shop thời trang nam INNOIR

---

## 1. Tổng quan sản phẩm

| Thông tin | Chi tiết |
|---|---|
| **Tên sản phẩm** | INNOIR Manager |
| **Loại** | Progressive Web App (PWA) — Mobile First |
| **Mục tiêu** | Quản lý bán hàng, thu chi, nhân viên, kho hàng cho shop thời trang nam |
| **Người dùng chính** | Phú / Lực / Tài (3 admin-seller) + nhân viên tương lai |
| **Ngôn ngữ** | Tiếng Việt |
| **Platform ưu tiên** | Điện thoại (mobile-first), cũng chạy tốt trên máy tính |

---

## 2. Design System

### 2.1 Brand Identity

**INNOIR Manager** — tên gợi lên sự tối giản, nội tâm, chuyên nghiệp. Giao diện phản ánh đúng tinh thần thương hiệu thời trang nam hiện đại.

### 2.2 Bảng màu

Không dùng palette một màu xanh-đen. INNOIR cần cảm giác shop thời trang nam: tối, gọn, chắc tay, nhưng vẫn có điểm ấm và dữ liệu dễ đọc.

| Token | Vai trò | Hex | Ghi chú dùng UI |
|---|---|---|---|
| `background` | Nền app | `#0D0F0E` | Không dùng đen tuyệt đối để giảm mỏi mắt |
| `surface` | Header, tab bar, sheet | `#151816` | Lớp nền chính trên mobile |
| `surface-raised` | Card, panel nổi | `#1D211E` | Dùng ít, không bọc mọi section bằng card |
| `surface-muted` | Input, table row, filter chip | `#242923` | Phân tách nhẹ bằng tone, không lạm dụng border |
| `border` | Divider, table line | `#343A34` | Mảnh 1px, opacity thấp |
| `text-primary` | Text chính | `#F4F1EA` | Off-white, dịu hơn trắng thuần |
| `text-secondary` | Label, mô tả | `#B8B2A7` | Đủ contrast trên nền tối |
| `text-muted` | Placeholder, metadata | `#7E7A72` | Không dùng cho nội dung quan trọng |
| `brand` | Accent INNOIR | `#3F6B4F` | Sage green trầm, dùng cho selected/primary |
| `brand-strong` | CTA chính | `#6FA77A` | Dùng cho nút xác nhận, focus ring |
| `cash` | Tiền mặt / doanh thu | `#C9A45C` | Warm gold, chỉ dùng cho số tiền hoặc badge tài chính |
| `info` | Link / trạng thái trung tính | `#6C8EA4` | Steel blue để phá one-note green |
| `danger` | Xóa / hủy đơn | `#D45A4C` | Luôn đi kèm text/icon, không chỉ màu |
| `success` | Thành công | `#76B07D` | Dùng tiết chế cho toast và trạng thái hoàn tất |

### 2.3 Typography

- **Font chính**: `Inter` (Google Fonts) — sans-serif hiện đại, đọc tốt trên mobile
- **Font số / data**: `JetBrains Mono` hoặc `font-variant-numeric: tabular-nums` — dùng cho giá tiền, tồn kho, doanh thu
- **Scale mobile**: 12 / 13 / 14 / 16 / 18 / 22 / 28
- **Scale desktop**: 12 / 14 / 16 / 18 / 24 / 32
- **Weight**: 400 (body), 500 (label), 600 (heading), 700 (số tiền lớn)
- **Line-height**: body 1.45–1.6, label 1.2–1.35
- **Letter spacing**: giữ `0`, không dùng tracking âm để tránh cảm giác template

### 2.4 UI Style

- **Operational luxury**: giao diện như công cụ vận hành shop thời trang, không phải landing page. Ưu tiên tốc độ bán hàng, scan dữ liệu nhanh, ít trang trí.
- **Dark-mode native**: nền tối nhiều lớp, contrast rõ, không dùng gradient hero, glow, blur trang trí hoặc orb.
- **Density có kiểm soát**: POS cần dày thông tin nhưng vẫn dễ chạm; báo cáo/admin có bảng gọn, filter rõ, không chia quá nhiều card.
- **Radius thấp**: dùng `8px` cho card/panel, `6px` cho input/chip, `999px` chỉ cho badge/pill nhỏ. Tránh `rounded-2xl` đại trà vì dễ ra chất SaaS template.
- **Icon**: Lucide Icons, stroke `1.75–2px`, size 18/20/24. Không dùng emoji làm icon điều hướng hoặc trạng thái.
- **Shadow/elevation**: rất tiết chế; ưu tiên border + surface tone. Sheet/modal dùng shadow sâu, card thường không cần shadow.
- **Animation**: 150–240ms, chỉ dùng cho press, sheet, toast, tab transition. Không animate layout width/height, không dùng animation trang trí.
- **Không có “AI copy” trong UI**: tránh câu mô tả dài kiểu “quản lý mọi thứ dễ dàng”. Màn hình chỉ dùng microcopy nghiệp vụ: “Thêm đơn”, “Ghi chi”, “Hủy đơn”, “In bill”.

### 2.5 Layout Principles

| Khu vực | Mobile | Desktop |
|---|---|---|
| App shell | Header 48–56px + bottom tab 64–72px, có safe-area bottom | Sidebar 240px + top bar 56px |
| Content gutter | 16px | 24–32px |
| Section spacing | 16px giữa nhóm liên quan, 24px giữa module | 24px giữa panel, 32px giữa vùng lớn |
| Touch target | Tối thiểu 44x44px | Tối thiểu 36x36px cho toolbar, 40px cho form |
| Main content width | Full width, không horizontal scroll | Max 1280–1440px tùy trang |
| Data table | Card list hoặc row compact trên mobile | Table thật, sticky header nếu nhiều dòng |

Nguyên tắc quan trọng: không bọc card trong card. Mỗi màn hình có một nền chính, các nhóm dữ liệu dùng divider, spacing, hoặc surface nhẹ để phân cấp.

### 2.6 Component Direction

**Buttons**

- Primary: nền `brand-strong`, text `#0D0F0E`, cao 44–48px mobile.
- Secondary: nền `surface-muted`, text `text-primary`, border `border`.
- Destructive: text/nền `danger`, luôn có confirm dialog nếu hủy đơn/xóa dữ liệu.
- Icon button: 40–44px, icon Lucide, có `aria-label`, hover/pressed không làm đổi kích thước.

**Inputs & Filters**

- Label luôn hiển thị; không dùng placeholder thay label.
- Input cao 44–48px mobile, radius 6px, focus ring `brand-strong`.
- Search trong POS cần nằm sticky ở đầu vùng sản phẩm.
- Filter dạng segmented control cho: ngày/tuần/tháng, tiền mặt/chuyển khoản/kết hợp, category sản phẩm.

**Cards / Rows**

- Product card mobile: ảnh vuông 64–72px, tên 2 dòng max, variant/stock nhỏ, giá tabular.
- Order item row: có stepper số lượng `- / +`, subtotal rõ, swipe không phải thao tác duy nhất để xóa.
- Metric card: chỉ dùng cho KPI thật; tối đa 2–4 card trên dashboard, không dùng card cho mọi dòng text.

**Feedback**

- Loading dưới 1s: skeleton row/card, không spinner toàn màn hình.
- Toast 3–5s, không che bottom tab hoặc CTA.
- Error đặt gần field hoặc vùng lỗi, viết rõ cách sửa: “Số tiền chuyển khoản chưa khớp tổng đơn”.
- Empty state ngắn, có action trực tiếp: “Chưa có đơn hôm nay” + “Tạo đơn”.

### 2.7 Screen-Level UI Direction

**POS / Bán hàng**

- Đây là màn hình ưu tiên số 1. Layout mobile nên có 3 vùng: search/filter sản phẩm, danh sách sản phẩm, order summary sticky dưới cùng.
- CTA chính luôn là “Xác nhận đơn”, nằm trong vùng ngón cái, không bị bottom tab che.
- Tổng tiền dùng font số lớn, tabular, màu `cash`; chi tiết thanh toán dùng segmented control.
- Sản phẩm hết hàng phải bị giảm emphasis và không tappable, nhưng vẫn nhìn thấy để nhân viên biết lý do không chọn được.

**Thu & Chi**

- Header có tổng thu, tổng chi, chênh lệch trong ngày.
- Form ghi chi dùng bottom sheet trên mobile, không chuyển trang nếu chỉ nhập nhanh.
- Danh mục chi dùng icon Lucide + label, không dùng màu riêng quá nhiều.

**Nhân viên**

- Dùng bảng/list theo người: ngày làm, số đơn, doanh thu. Tên người là anchor chính, số liệu căn phải.
- Calendar chỉ dùng khi cần xem lịch; không ép mọi dữ liệu vào lịch vì khó scan trên mobile.

**Kho & Sản phẩm**

- Admin desktop dùng table với cột SKU, size, màu, tồn, giá bán, giá nhập, trạng thái.
- Mobile dùng list row compact; action sửa/xóa nằm trong menu `MoreHorizontal`, tránh nhiều nút lộ ra.
- Variant nên hiển thị bằng chip nhỏ, ví dụ `Đen / L`, `Kem / M`.

**Báo cáo**

- Chart chỉ xuất hiện khi giúp quyết định kinh doanh. Không đặt chart trang trí nếu bảng số liệu đã đủ.
- Line chart doanh thu theo ngày: có tooltip, trục ngày rõ, không dựa vào màu duy nhất.
- Top sản phẩm bán chạy nên là ranked list trước, chart sau nếu còn chỗ.

### 2.8 Anti “AI Feeling” Checklist

- Không dùng emoji trong nav, KPI, empty state.
- Không dùng gradient tím/xanh, glow mạnh, glassmorphism, orb, bokeh, minh họa SVG generic.
- Không viết headline marketing trong app vận hành. UI text phải giống nhân viên shop đang dùng thật.
- Không lặp cấu trúc “card + icon + title + description” cho mọi tính năng.
- Không dùng bo góc quá lớn, shadow nhiều lớp, icon nhiều màu.
- Không dùng ảnh stock tối mờ cho sản phẩm; nếu có ảnh sản phẩm, ảnh phải rõ item, tỷ lệ ổn định.
- Mỗi màn hình chỉ có một primary action rõ ràng.
- Số tiền, tồn kho, số lượng luôn căn phải hoặc dùng tabular để tránh nhảy layout.

### 2.9 Accessibility & Responsive Rules

- Contrast text thường tối thiểu 4.5:1; secondary text tối thiểu 3:1.
- Tất cả icon-only button phải có accessible label.
- Focus ring luôn hiển thị khi dùng keyboard.
- Hỗ trợ `prefers-reduced-motion`; animation không được chặn thao tác.
- Không disable zoom trên mobile.
- Bottom tab, sticky CTA, sheet phải tính safe-area cho iOS/Android.
- Kiểm tra layout ở 375px, 768px, 1024px và desktop rộng.

---

## 3. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                   INNOIR Manager PWA                     │
│              (Next.js + Tailwind, Mobile First)          │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  POS /   │  Thu &   │  Nhân    │  Kho &   │   Báo cáo  │
│  Bán hàng│  Chi     │  viên    │  SP      │   & Export  │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│             /admin (shared admin password)                │
│   Quản lý sản phẩm/variant | Nhân viên | Cài đặt | Backup │
├─────────────────────────────────────────────────────────┤
│               Backend: Supabase (PostgreSQL)             │
│    Auth nhẹ | Realtime | RLS | Storage | Audit dữ liệu    │
├──────────────────────────┬──────────────────────────────┤
│ In Bill Browser/WiFi/BT  │   Export (Excel / PDF)        │
│ Browser Print primary    │   SheetJS + Browser Print     │
│  ESC/POS 58mm            │                               │
└──────────────────────────┴──────────────────────────────┘
```

---

## 4. Danh sách tính năng (Feature List)

### 4.1 Module POS — Bán hàng

- Giao diện bán hàng nhanh, tối ưu cho 1 tay dùng trên điện thoại
- Chọn sản phẩm từ danh sách có sẵn (có tìm kiếm, lọc theo loại)
- Nhập số lượng, xem tổng tiền real-time
- Chọn **người bán**: Lực / Tài / Phú / Nhân viên khác
- Ghi chú đơn hàng (tuỳ chọn)
- Chọn hình thức thanh toán: Tiền mặt / Chuyển khoản / Kết hợp
- Xác nhận → ghi đơn vào database → in bill (tuỳ chọn)
- Lịch sử đơn hàng trong ngày (có thể huỷ đơn nếu có quyền)

### 4.2 Module Thu & Chi

- **Ghi thu**: Tự động cộng dồn từ POS, hoặc ghi thu thủ công
- **Ghi chi**: Nhập tiền nhập hàng, chi phí vận hành (ship, bao bì, điện...)
- Mỗi khoản chi có: ngày, danh mục, số tiền, ghi chú, người ghi
- Xem tổng thu / chi / lợi nhuận theo: ngày | tuần | tháng
- Biểu đồ doanh thu theo ngày trong tháng
- Export Excel: báo cáo thu chi theo tuần / tháng

### 4.3 Module Nhân viên

**Hiện tại (Phase 1):**

Danh sách cố định: **Lực / Tài / Phú / Nhân viên khác**

- Track số ngày làm việc trong tháng (check-in đầu ca hoặc admin ghi)
- Doanh số bán của từng người (tính từ đơn có gán tên người bán)
- Lịch làm theo tháng (calendar view, ai làm ngày nào)
- Xem báo cáo cá nhân: tổng đơn, tổng doanh số, số ngày làm

**Phase 2 (khi thuê thêm nhân viên):**

- Thêm nhân viên mới từ trang admin
- Phân quyền: admin (full) | staff (chỉ bán hàng + xem lịch cá nhân)

### 4.4 Module Kho & Sản phẩm

> Chỉ admin mới được chỉnh sửa

- Danh sách sản phẩm: tên, loại (áo / quần / phụ kiện...), giá bán, giá nhập
- Quản lý variant theo size / màu / SKU để theo dõi tồn kho đúng thực tế thời trang
- Thêm / sửa / xoá sản phẩm
- Ghi nhập hàng: chọn variant, số lượng, tổng tiền nhập → tự động ghi vào mục **Chi** và tạo lịch sử kho
- Xem tồn kho theo variant, có lịch sử nhập / bán / điều chỉnh / huỷ đơn
- Tìm kiếm & lọc sản phẩm

### 4.5 Module Báo cáo & Export

- Dashboard tổng quan: doanh thu hôm nay, tuần này, tháng này
- Top sản phẩm bán chạy (theo số lượng / doanh thu)
- Bảng doanh số từng nhân viên trong tháng
- Biểu đồ doanh thu theo ngày (line chart)
- **Export Excel**: chọn khoảng thời gian → tải file `.xlsx`
  - Sheet 1: Danh sách đơn hàng
  - Sheet 2: Thu chi tổng hợp
  - Sheet 3: Doanh số nhân viên

### 4.6 In Bill

- **MVP ưu tiên**: Preview bill trên browser → in từ trình duyệt (tương thích rộng nhất)
- Hỗ trợ máy in **Bluetooth** (tay cầm, 58mm) qua **Web Bluetooth API** nếu chạy Android/Chrome và thiết bị tương thích
- Hỗ trợ máy in **WiFi / LAN** qua local print server nếu shop có máy in cố định
- Format bill: Logo/tên shop, danh sách sản phẩm, tổng tiền, hình thức thanh toán, ngày giờ, người bán
- Bill format: ESC/POS cho máy nhiệt

---

## 5. Trang Admin (`/admin`)

### 5.1 Bảo mật

- Truy cập qua URL `/admin` ( ở UI thì có nút để chuyển qua kèm manual login với password)
- **Yêu cầu mật khẩu admin dùng chung** cho nhóm chủ shop / admin hiện tại
- Không bắt buộc OAuth hoặc đăng nhập qua nền tảng ngoài vì quy mô shop nhỏ
- Mật khẩu admin chỉ mở giao diện quản trị; thao tác admin vẫn cần kiểm tra ở API route, RLS bổ sung khi bật tài khoản nhân viên ở Phase 2
- Session admin lưu trong cookie bảo mật, `HttpOnly`, `SameSite=Lax`, timeout sau 8 giờ
- Nếu sai mật khẩu 5 lần → khoá 30 phút
- Nên đổi mật khẩu định kỳ hoặc ngay khi có nhân sự nghỉ / không còn quyền admin

### 5.2 Chức năng Admin

| Mục | Mô tả |
|---|---|
| **Quản lý sản phẩm** | Thêm / sửa / xoá sản phẩm và variant, cập nhật giá, upload ảnh |
| **Quản lý nhân viên** | Xem thông tin, thêm nhân viên mới (phase 2), ghi lịch làm |
| **Quản lý chi phí** | Xem / sửa / xoá các khoản chi đã ghi |
| **Cài đặt shop** | Tên shop, địa chỉ, SĐT, thông tin bill, logo |
| **Backup dữ liệu** | Export toàn bộ data ra JSON hoặc Excel |
| **Đổi mật khẩu admin** | Đổi mật khẩu vào trang /admin |

---

## 6. Database Schema (Supabase / PostgreSQL)

### Bảng chính

```sql
-- Nhân viên / Người dùng nội bộ
users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                       -- 'Lực' | 'Tài' | 'Phú' | 'Nhân viên khác'
  role text NOT NULL,                       -- 'admin' | 'staff'
  pin_code text NULL,                       -- Phase 2 nếu muốn nhân viên tự đăng nhập nhanh
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Sản phẩm cha
products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,                   -- 'Áo' | 'Quần' | 'Phụ kiện'
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Variant theo size / màu / SKU
product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  sku text UNIQUE,
  size text,                                -- S / M / L / XL / 30 / 31...
  color text,
  price integer NOT NULL,                   -- Giá bán (VND)
  cost_price integer NOT NULL DEFAULT 0,    -- Giá nhập gần nhất / mặc định
  stock integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Đơn hàng
orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sold_by uuid NOT NULL REFERENCES users(id),
  total_amount integer NOT NULL,
  payment_method text NOT NULL,             -- 'cash' | 'transfer' | 'mixed'
  cash_amount integer NOT NULL DEFAULT 0,
  transfer_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed', -- 'completed' | 'cancelled'
  note text,
  cancelled_by uuid REFERENCES users(id) NULL,
  cancelled_at timestamptz NULL,
  cancel_reason text NULL,
  business_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  created_at timestamptz DEFAULT now()
)

-- Chi tiết đơn hàng, có snapshot để báo cáo không bị đổi khi sửa sản phẩm
order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_name text NOT NULL,
  variant_label text,                       -- ví dụ: 'Đen / L'
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  subtotal integer NOT NULL
)

-- Lịch sử kho: nhập hàng, bán hàng, huỷ đơn, điều chỉnh
inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  type text NOT NULL,                       -- 'import' | 'sale' | 'cancel' | 'adjustment'
  quantity integer NOT NULL,                -- nhập/dương, bán/âm
  unit_cost integer DEFAULT 0,
  reference_type text,                      -- 'order' | 'manual_import' | 'manual_adjustment'
  reference_id uuid,
  note text,
  created_by uuid REFERENCES users(id),
  business_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  created_at timestamptz DEFAULT now()
)

-- Thu chi
transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,                       -- 'income' | 'expense'
  category text NOT NULL,                   -- 'sale' | 'import' | 'other_expense' | 'manual_income'
  amount integer NOT NULL,
  description text,
  recorded_by uuid REFERENCES users(id),
  order_id uuid REFERENCES orders(id) NULL, -- link nếu từ POS
  business_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  created_at timestamptz DEFAULT now()
)

-- Lịch làm việc
work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  work_date date NOT NULL,                  -- ngày làm theo giờ Việt Nam, không convert từ UTC
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, work_date)
)

-- Cài đặt shop
settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
)
```

### Nguyên tắc dữ liệu quan trọng

- **Không xoá cứng đơn hàng đã bán**: khi huỷ đơn, đổi `status = 'cancelled'`, lưu người huỷ, thời gian và lý do.
- **Không chỉ dựa vào `stock` hiện tại**: mọi thay đổi kho phải có dòng trong `inventory_movements` để kiểm tra lại khi lệch tồn.
- **Tiền dùng integer VND**: tránh lỗi làm tròn số thập phân.
- **Dữ liệu bán hàng cần snapshot**: `order_items.product_name`, `variant_label`, `unit_price` giữ đúng lịch sử kể cả khi admin đổi tên hoặc giá sản phẩm sau này.
- **Timezone cố định theo Việt Nam**: mọi ngày nghiệp vụ của shop dùng `Asia/Ho_Chi_Minh` (UTC+7), không dùng timezone server Vercel.
- **Tách audit time và business date**: `created_at` dùng `timestamptz` để audit chính xác thời điểm; `business_date` dùng `date` local Việt Nam để lọc doanh thu, thu chi, kho theo ngày.
- **Query báo cáo theo ngày luôn dùng `business_date`**: không filter bằng `created_at::date` vì server/database có thể chạy UTC và làm lệch đơn sau 00:00 Việt Nam.
- **`work_logs.work_date` là ngày local Việt Nam**: staff làm ngày nào thì lưu đúng ngày đó, không convert từ UTC.

---

## 7. Tech Stack

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| **Frontend** | Next.js App Router (current stable) | SSR + PWA support tốt, tránh khoá vào version cũ |
| **Styling** | Tailwind CSS | Nhanh, mobile-first sẵn |
| **UI Components** | shadcn/ui primitives + custom INNOIR tokens | Lấy accessibility/base behavior, tránh giữ nguyên look mặc định |
| **Icons** | Lucide React | Outline đồng nhất, thay emoji trong navigation/action |
| **Database** | Supabase (PostgreSQL) | Free tier, realtime, storage, RLS |
| **Auth** | App session + shared admin password | Đủ đơn giản cho shop nhỏ; Phase 2 có thể thêm PIN / Supabase Auth nếu cần |
| **Charts** | Recharts | React-native, nhẹ |
| **Export Excel** | SheetJS (xlsx) | Client-side, không cần server |
| **In Bill chính** | Browser Print | Tương thích rộng nhất, phù hợp MVP |
| **In Bill (BT)** | Web Bluetooth API | Thử nghiệm cho Android/Chrome, không đảm bảo trên iOS |
| **In Bill (WiFi)** | Fetch to local print server | Node.js nhỏ chạy local, triển khai sau khi ổn định POS |
| **Deploy** | Vercel | Free, HTTPS tự động, CDN |
| **PWA** | Serwist hoặc next-pwa nếu còn phù hợp | Service worker, install prompt, cache offline |

---

## 8. Cấu trúc URL / Route

```
/                         → Redirect đến /pos (trang bán hàng)
/pos                      → Màn hình POS bán hàng (mặc định khi mở app)
/pos/history              → Lịch sử đơn hàng hôm nay
/finance                  → Thu chi tổng quan
/finance/expense/new      → Ghi chi phí mới
/staff                    → Danh sách nhân viên + doanh số
/staff/schedule           → Lịch làm việc theo tháng
/reports                  → Báo cáo & biểu đồ
/reports/export           → Export Excel / PDF

/admin                    → Trang admin (yêu cầu mật khẩu admin)
/admin/products           → Quản lý sản phẩm
/admin/products/new       → Thêm sản phẩm
/admin/products/[id]      → Sửa / xoá sản phẩm
/admin/staff              → Quản lý nhân viên
/admin/expenses           → Quản lý chi phí
/admin/settings           → Cài đặt shop
/admin/backup             → Backup & export data
```

---

## 9. Navigation (Mobile Bottom Tab)

| Tab | Icon Lucide | Route | Mục đích |
|---|---|---|---|
| Bán | `ShoppingCart` | `/pos` | Tạo đơn, xem giỏ, thanh toán |
| Thu Chi | `Wallet` | `/finance` | Xem tổng ngày, ghi chi nhanh |
| Nhân viên | `Users` | `/staff` | Doanh số, ngày làm, lịch |
| Báo cáo | `ChartNoAxesColumn` | `/reports` | KPI, top sản phẩm, export |

Tab bar cố định ở dưới cùng — chuẩn mobile native UX. Icon dùng Lucide, cùng stroke width, có label text bên dưới để dễ hiểu và hỗ trợ accessibility.
Trang `/admin` không nằm trong nav chính — truy cập qua Settings hoặc URL trực tiếp.

Quy tắc tab bar:

- Tối đa 4 tab trong MVP: Bán, Thu Chi, Nhân viên, Báo cáo.
- Mỗi tab có hit area tối thiểu 44x44px, active state dùng `brand-strong` + label rõ.
- Không dùng badge động nếu chưa có nhu cầu thật; badge chỉ dùng cho cảnh báo quan trọng như tồn kho thấp.
- `/admin` không nằm trong bottom tab để tránh nhân viên thao tác nhầm; đặt entry trong Settings hoặc truy cập URL trực tiếp.

---

## 10. Lộ trình Build (Phases)

### Phase 1 — MVP (2–3 tuần)

> Mục tiêu: Dùng được ngay để bán hàng và ghi sổ

- [ ] Setup Next.js + Tailwind + Supabase
- [ ] Auth nhẹ: chọn người bán khi mở app, admin dùng mật khẩu dùng chung để vào `/admin`
- [ ] Thiết kế bảng sản phẩm + variant theo size / màu / SKU
- [ ] Module POS: chọn sản phẩm, tính tiền, xác nhận đơn
- [ ] Thanh toán tiền mặt / chuyển khoản / kết hợp, lưu rõ số tiền từng loại
- [ ] Module Thu chi: xem tổng ngày, ghi chi thủ công
- [ ] Danh sách người bán: Lực / Tài / Phú / Nhân viên khác
- [ ] Lịch sử đơn hàng trong ngày, huỷ đơn bằng trạng thái `cancelled` kèm lý do
- [ ] Trang /admin cơ bản: thêm/sửa/xoá sản phẩm, mật khẩu bảo vệ
- [ ] In bill fallback bằng browser print
- [ ] Deploy lên Vercel + cài như PWA trên điện thoại

### Phase 2 — Báo cáo & Kho (2 tuần)

> Mục tiêu: Có đủ dữ liệu để đánh giá kinh doanh

- [ ] Module Báo cáo: biểu đồ doanh thu, top sản phẩm
- [ ] Export Excel (đơn hàng, thu chi, nhân viên)
- [ ] Doanh số từng người bán theo tháng
- [ ] Lịch làm việc (calendar, ghi ngày làm)
- [ ] Quản lý kho: tồn kho theo variant, ghi nhập hàng → tự ghi chi và tạo lịch sử kho
- [ ] Trang /admin đầy đủ: nhân viên, chi phí, cài đặt shop

### Phase 3 — Polish & Print (1–2 tuần)

> Mục tiêu: Hoàn thiện trải nghiệm, thêm in bill

- [ ] In bill qua Bluetooth (Web Bluetooth API + ESC/POS) nếu thiết bị hỗ trợ tốt
- [ ] In bill qua WiFi / local print server nếu shop dùng máy in cố định
- [ ] Offline mode (service worker cache cho POS)
- [ ] PWA install prompt tối ưu (Android + iOS)
- [ ] Dark mode polish, animation, micro-interactions
- [ ] Thêm nhân viên mới từ admin (phase 2 user management)

---

## 11. Bảo mật & Phân quyền

| Tính năng | Admin (Phú/Lực/Tài) | Staff (nhân viên) |
|---|---|---|
| Bán hàng | ✅ | ✅ |
| Xem đơn hàng hôm nay | ✅ | ✅ (của mình) |
| Huỷ đơn hàng | ✅ | ❌ |
| Ghi chi phí | ✅ | ❌ |
| Xem báo cáo | ✅ | ❌ |
| Export Excel | ✅ | ❌ |
| Vào trang /admin | ✅ (cần password) | ❌ |
| Thêm / sửa sản phẩm | ✅ | ❌ |
| Xem lịch làm cá nhân | ✅ | ✅ |

**Lưu ý bảo mật:**
- Trang `/admin` bảo vệ bằng mật khẩu admin dùng chung, phù hợp quy mô shop nhỏ và không cần OAuth.
- Không lưu mật khẩu admin dạng plain text; lưu hash bằng `bcrypt` / `argon2` trong biến môi trường hoặc bảng settings bảo vệ riêng.
- Cookie admin phải là `HttpOnly`, `Secure`, `SameSite=Lax`, timeout sau 8 giờ.
- Supabase Row-Level Security (RLS) dùng để bảo vệ dữ liệu ở tầng database khi có tài khoản nhân viên / phân quyền chi tiết ở Phase 2.
- API route cho thao tác admin phải kiểm tra session admin, không chỉ ẩn nút trên giao diện.
- Ghi log cho thao tác nhạy cảm: huỷ đơn, sửa giá, chỉnh tồn kho, export backup.

---

## 12. Chi tiết In Bill

### Format bill mẫu

```
================================
       INNOIR - Nam Fashion
     123 Đường ABC, TP.HCM
       SĐT: 0909 xxx xxx
================================
Ngày: 15/01/2025  14:32
Nhân viên: Phú
--------------------------------
Áo thun INNOIR logo đen L  x1
                       250.000đ
Quần kaki slim fit 31   x1
                       450.000đ
--------------------------------
Tổng:               700.000đ
Thanh toán: Tiền mặt
================================
       Cảm ơn bạn đã mua hàng!
         Hẹn gặp lại tại INNOIR
================================
```

### Thiết bị in tương thích

| Loại | Kết nối | Thư viện |
|---|---|---|
| Máy in nhiệt 58mm cầm tay | Bluetooth BLE | Web Bluetooth API |
| Máy in nhiệt 80mm bàn | WiFi / LAN | Fetch → local print server |
| Bất kỳ máy in nào | Browser print | `window.print()` với CSS print media |

---

## 13. Ghi chú triển khai

- **Domain**: có thể dùng Vercel subdomain miễn phí hoặc custom domain
- **HTTPS**: bắt buộc — Vercel tự cấp SSL, cần thiết cho Web Bluetooth và PWA
- **PWA install trên iOS**: cần hướng dẫn thủ công (Safari → Share → Add to Home Screen)
- **PWA install trên Android**: browser tự hiện install prompt
- **Offline**: Phase 3 — service worker cache màn hình POS và danh sách sản phẩm
- **Backup**: Admin có thể export toàn bộ data ra Excel mỗi tháng
- **Supabase free tier**: 500MB database, 50MB storage — đủ dùng cho quy mô shop nhỏ

---

## 14. Implementation Plan & Debug/Test Checklist

Mục tiêu của section này là build nhanh theo từng lát nhỏ, mỗi lát có file rõ ràng, test rõ ràng, tránh làm cả module lớn rồi mới debug.

### 14.1 Quy ước build

- Mỗi task chỉ nên chạm một module chính: POS, Finance, Staff, Inventory, Reports, Admin, Print.
- Build theo thứ tự: schema → seed data → server action/API → query/service → UI component → page integration → test.
- Mọi mutation quan trọng phải trả về object rõ ràng: `{ ok, data, error }`, không throw lỗi thẳng ra UI trừ lỗi hệ thống.
- Tiền luôn format ở UI bằng helper chung, database chỉ lưu integer VND.
- Không viết logic tính tiền trong component nếu logic đó còn dùng cho bill, báo cáo hoặc test.
- Mỗi màn hình xong phải có ít nhất manual smoke test trước khi chuyển module khác.

### 14.2 File map đề xuất

```txt
app/
  layout.tsx
  page.tsx                         -> redirect /pos
  pos/
    page.tsx
    history/page.tsx
  finance/
    page.tsx
    expense/new/page.tsx
  staff/
    page.tsx
    schedule/page.tsx
  reports/
    page.tsx
    export/page.tsx
  admin/
    page.tsx
    products/page.tsx
    products/new/page.tsx
    products/[id]/page.tsx
    staff/page.tsx
    expenses/page.tsx
    settings/page.tsx
    backup/page.tsx

components/
  app-shell/
    AppHeader.tsx
    BottomTabNav.tsx
    DesktopSidebar.tsx
  pos/
    ProductSearch.tsx
    ProductGrid.tsx
    ProductRow.tsx
    CartSummary.tsx
    PaymentMethodControl.tsx
    OrderConfirmSheet.tsx
  finance/
    FinanceSummary.tsx
    TransactionList.tsx
    ExpenseForm.tsx
  admin/
    ProductForm.tsx
    VariantEditor.tsx
    AdminPasswordGate.tsx
  reports/
    RevenueChart.tsx
    TopProductsList.tsx
  print/
    BillPreview.tsx
    PrintableBill.tsx

lib/
  supabase/
    client.ts
    server.ts
  db/
    products.ts
    orders.ts
    transactions.ts
    inventory.ts
    users.ts
    settings.ts
  money.ts
  dates.ts
  permissions.ts
  validation.ts

db/
  schema.sql
  seed.sql
```

### 14.3 Timezone convention

Shop vận hành tại Việt Nam, nên toàn bộ ngày nghiệp vụ dùng timezone cố định `Asia/Ho_Chi_Minh`.

- `created_at`: luôn là `timestamptz`, dùng cho audit/log/thứ tự sự kiện.
- `business_date`: là `date` theo giờ Việt Nam, dùng cho order, transaction, inventory movement, báo cáo ngày/tuần/tháng.
- `work_logs.work_date`: là ngày làm local Việt Nam do admin/staff chọn.
- Client có thể hiển thị giờ bằng `Asia/Ho_Chi_Minh`, nhưng query báo cáo không dựa vào format giờ phía client.
- Server action tạo đơn/chi phí/nhập hàng phải set hoặc để database default `business_date = ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)`.
- Nếu cho phép nhập dữ liệu lùi ngày, UI phải gửi `business_date` rõ ràng thay vì sửa `created_at`.

Ví dụ query đúng:

```sql
select *
from orders
where business_date = '2026-05-17'
  and status = 'completed';
```

Tránh query kiểu:

```sql
-- Tránh dùng cho báo cáo ngày vì dễ lệch timezone khi deploy server UTC.
where created_at::date = '2026-05-17'
```

### 14.4 Seed data Phase 1

Phase 1 nên có seed data trước để POS dùng được ngay, không phụ thuộc admin nhập tay toàn bộ sản phẩm sau deploy. Nguồn dữ liệu seed chính là `db/seed.sql`; khi Supabase MCP được kết nối thì dùng MCP để chạy schema/seed trực tiếp trên project Supabase.

**Cách làm ưu tiên**

- Dùng Supabase MCP tạo schema từ `db/schema.sql`.
- Dùng Supabase MCP insert seed users, products, variants từ `db/seed.sql`.
- Sau khi seed xong, mở POS kiểm tra danh sách sản phẩm và tồn kho.
- Admin products vẫn phải có trong Phase 1 để sửa seed data và nhập thêm hàng thật.

**Users seed**

| Name | Role | Ghi chú |
|---|---|---|
| Phú | admin | Chủ/admin-seller |
| Lực | admin | Admin-seller |
| Tài | admin | Admin-seller |
| Nhân viên khác | staff | Placeholder Phase 1 |

**Products/variants seed mẫu**

| Product | Category | Variants | Giá bán | Giá nhập mẫu | Stock |
|---|---|---|---:|---:|---:|
| Áo thun INNOIR logo | Áo | Đen / M, Đen / L, Trắng / M, Trắng / L | 250000 | 120000 | 5 mỗi variant |
| Sơ mi oversize basic | Áo | Đen / M, Đen / L, Kem / M, Kem / L | 390000 | 210000 | 3 mỗi variant |
| Quần kaki slim fit | Quần | Đen / 30, Đen / 31, Nâu / 30, Nâu / 31 | 450000 | 260000 | 3 mỗi variant |
| Quần jeans straight | Quần | Xanh đậm / 30, Xanh đậm / 31, Đen / 30, Đen / 31 | 520000 | 310000 | 2 mỗi variant |
| Nón canvas INNOIR | Phụ kiện | Đen / Free, Kem / Free | 180000 | 80000 | 5 mỗi variant |
| Dây nịt da basic | Phụ kiện | Đen / Free, Nâu / Free | 220000 | 110000 | 4 mỗi variant |

**Seed validation**

- Có ít nhất 4 users.
- Có ít nhất 6 products.
- Có ít nhất 20 variants.
- Mỗi variant có `sku`, `price`, `cost_price`, `stock`.
- POS search trả về sản phẩm ngay sau seed.
- Tạo đơn test với seed data trừ đúng stock.

### 14.5 Phase 1 implementation slices

| Slice | Files chính | Done khi |
|---|---|---|
| Project foundation | `app/layout.tsx`, Tailwind config, theme tokens, `components/app-shell/*` | App chạy mobile/desktop, bottom tab đúng route, không overflow 375px |
| Supabase schema | `db/schema.sql`, `db/seed.sql`, `lib/supabase/*` | Tạo được bảng, seed user/sản phẩm mẫu bằng Supabase MCP hoặc SQL, query đọc được từ app |
| Auth nhẹ | `lib/permissions.ts`, `app/admin/page.tsx`, `AdminPasswordGate.tsx` | Chọn người bán, vào admin bằng password, session hết hạn đúng |
| Product read | `lib/db/products.ts`, `ProductSearch.tsx`, `ProductGrid.tsx` | POS load sản phẩm/variant, search/filter hoạt động |
| Cart & payment | `CartSummary.tsx`, `PaymentMethodControl.tsx`, `lib/money.ts` | Thêm/xóa/đổi số lượng, tổng tiền và mixed payment khớp |
| Create order | `lib/db/orders.ts`, `lib/db/inventory.ts`, POS page integration | Xác nhận đơn tạo `orders`, `order_items`, trừ kho, tạo transaction income |
| Order history/cancel | `/pos/history`, `lib/db/orders.ts` | Xem đơn hôm nay, hủy đơn đổi status, hoàn kho, lưu lý do |
| Finance MVP | `/finance`, `ExpenseForm.tsx`, `lib/db/transactions.ts` | Xem tổng thu/chi ngày, ghi chi thủ công |
| Admin products MVP | `/admin/products/*`, `ProductForm.tsx`, `VariantEditor.tsx` | Thêm/sửa/xóa mềm sản phẩm và variant |
| Browser print | `BillPreview.tsx`, `PrintableBill.tsx` | Preview bill đúng format, `window.print()` in được |

### 14.6 Phase 2 implementation slices

| Slice | Files chính | Done khi |
|---|---|---|
| Reports dashboard | `/reports`, `RevenueChart.tsx`, `TopProductsList.tsx` | Hiển thị doanh thu ngày/tuần/tháng, top sản phẩm đúng dữ liệu |
| Export Excel | `/reports/export`, `lib/db/orders.ts`, SheetJS helper | Export `.xlsx` có 3 sheet: đơn hàng, thu chi, nhân viên |
| Staff sales | `/staff`, `lib/db/users.ts`, `lib/db/orders.ts` | Xem doanh số từng người theo tháng |
| Work schedule | `/staff/schedule`, `work_logs` query | Ghi/xem ngày làm, không trùng user/date |
| Inventory management | `lib/db/inventory.ts`, admin product pages | Nhập hàng tạo inventory movement, transaction expense, cập nhật stock |
| Admin full | `/admin/staff`, `/admin/expenses`, `/admin/settings`, `/admin/backup` | Admin quản lý đủ nhân viên, chi phí, setting, backup |

### 14.7 Phase 3 implementation slices

| Slice | Files chính | Done khi |
|---|---|---|
| PWA/offline | service worker config, manifest, app shell | App install được, mở POS khi mạng yếu, cache không làm sai dữ liệu đơn |
| Print polish | `components/print/*`, Web Bluetooth helper | Browser print ổn định, Bluetooth chỉ bật khi thiết bị/browser hỗ trợ |
| WiFi print | local print server docs/helper | Gửi bill tới local server được trong mạng nội bộ |
| UI polish | theme tokens, all module pages | Motion nhẹ, focus/pressed states rõ, no emoji, no card-heavy template |
| Permission phase 2 | RLS policies, user role checks | Staff không vào admin/export/hủy đơn trái quyền |

### 14.8 Debug checklist chung

- Kiểm tra console browser không có error/hydration warning.
- Kiểm tra network tab: mutation không gọi lặp khi double click.
- Refresh trang sau mutation để chắc dữ liệu đã persist.
- Test ở viewport 375px, 768px, 1024px.
- Test bằng keyboard: tab order, focus ring, Enter/Escape trong modal/sheet.
- Test loading/empty/error state cho từng danh sách.
- Test timezone ngày bán hàng theo giờ Việt Nam bằng `business_date`, không lệch ngày khi deploy Vercel UTC.
- Test dữ liệu số tiền lớn, tên sản phẩm dài, variant dài, tồn kho bằng 0.
- Test seed data sau khi chạy Supabase MCP: đủ users/products/variants và POS đọc được dữ liệu.

### 14.9 Manual test theo module

**POS**

- Search sản phẩm theo tên, category, variant.
- Thêm 1 sản phẩm nhiều variant vào giỏ.
- Tăng/giảm số lượng, xóa item, thêm lại item.
- Thanh toán tiền mặt, chuyển khoản, mixed payment.
- Mixed payment không đủ tổng tiền phải báo lỗi gần control thanh toán.
- Xác nhận đơn thành công tạo order và trừ đúng stock.
- Double click “Xác nhận đơn” không tạo 2 đơn.
- Sản phẩm hết hàng không cho thêm vào giỏ.

**Order history**

- Xem đúng đơn hôm nay.
- Hủy đơn yêu cầu lý do.
- Hủy đơn xong status là `cancelled`, không xóa record.
- Hủy đơn hoàn lại inventory movement và cập nhật stock.
- Staff không có quyền hủy nếu Phase 2 bật phân quyền.

**Finance**

- Tổng thu tự cộng từ đơn POS.
- Ghi chi thủ công hiển thị ngay trong danh sách.
- Xóa/sửa chi phí chỉ admin làm được.
- Lọc ngày/tuần/tháng trả về số đúng.
- Số tiền âm hoặc không hợp lệ bị chặn.

**Admin products**

- Thêm sản phẩm có nhiều variant size/màu.
- Sửa giá không làm thay đổi đơn hàng cũ vì order item đã snapshot.
- Xóa mềm sản phẩm không làm mất lịch sử bán hàng.
- SKU trùng phải báo lỗi rõ.
- Upload/hiển thị ảnh sản phẩm không làm layout nhảy.

**Inventory**

- Nhập hàng tăng stock đúng variant.
- Nhập hàng tự tạo transaction expense.
- Điều chỉnh tồn kho tạo movement type `adjustment`.
- Tồn kho không được âm trừ khi có rule admin override rõ ràng.

**Reports & Export**

- Doanh thu ngày/tuần/tháng khớp tổng order completed.
- Order cancelled không tính doanh thu.
- Top sản phẩm tính theo quantity và revenue đúng.
- Export Excel mở được, tiếng Việt không lỗi font.
- Sheet export có header rõ và tiền là number, không phải text nếu cần tính tiếp.

**Print bill**

- Preview bill hiển thị đủ shop info, ngày giờ, nhân viên, sản phẩm, tổng tiền.
- Bill 58mm không vỡ dòng nghiêm trọng với tên sản phẩm dài.
- Browser print không in nav/header app.
- Nếu Bluetooth không hỗ trợ, UI fallback sang browser print.

### 14.10 Automated test tối thiểu

Ưu tiên unit test cho logic nghiệp vụ trước, E2E sau khi UI ổn định.

| Loại test | Nên test | Gợi ý tool |
|---|---|---|
| Unit | `formatMoney`, tính tổng giỏ, mixed payment, validate order, date range | Vitest |
| Integration | tạo order → order_items → inventory movement → transaction | Vitest + Supabase local/test DB |
| Component | cart summary, payment control, product form validation | React Testing Library |
| E2E smoke | POS tạo đơn, hủy đơn, admin thêm sản phẩm, export | Playwright |

### 14.11 Definition of Done cho mỗi slice

- Code chạy không lỗi TypeScript/lint.
- Manual tests của slice đã pass.
- Empty/loading/error state có UI rõ.
- Không có horizontal scroll ở 375px.
- Không có hardcoded raw color trong component nếu token đã có.
- Không có emoji làm icon UI.
- Dữ liệu mutation có audit trail nếu liên quan đơn hàng, kho, chi phí.
- Có ghi chú follow-up nếu tính năng bị defer sang phase sau.

---

*Blueprint v1.0 — INNOIR Manager*
*Cập nhật theo thực tế khi bắt đầu build*
