# 2Q Manager - Development Checklist

Checklist này được trích xuất từ `blueprint.md` v1.1. Mục đích là để track tiến độ và "Definition of Done" của từng feature slice.

## Phase 1: Foundation & Supabase Setup
- [x] **Next.js 16 App**: Khởi tạo với Tailwind CSS, TypeScript, App Router.
- [x] **Design System & Typography**: 
  - Setup biến màu (ink, paper, mid, rule, surface, destructive, success).
  - Setup font: Bebas Neue (Display), Inter (Body), **JetBrains Mono** (Price/SKU).
  - Setup UI components cơ bản (Header full ink, thẻ card grid 1px, Button border-radius 4-6px).
- [x] **Database Schema**: Tạo file migrations cho toàn bộ tables (profiles, stores, products, orders, attendance, transactions, v.v.).
- [x] **Seed Data**: Viết file `00_seed.sql` tạo 1 default store và các ca làm việc (shift_config) mặc định.
- [x] **Security (RLS)**: Bật RLS cho tất cả tables và viết các Policy (Read/Write) theo phân quyền Admin/Staff. (Đặc biệt lưu ý `transactions` và `inventory_movements` chỉ có Admin Read, No Client Write).
- [x] **Database Triggers & RPCs**:
  - Hàm `update_updated_at` (với `SECURITY DEFINER SET search_path = ''`).
  - RPC: `checkout_order`, `cancel_order`, `transfer_product`, `clock_in`, `clock_out`, `create_product`.
- [x] **Supabase Auth**: Setup Client/Server Supabase Helpers, Auth Callback, và màn hình Login cơ bản.

## Phase 2: Core Product Management & POS
- [x] **Routing & Layout**: Setup layout tách biệt cho `/admin/*` và `/staff/*`. Setup Bottom Tab Bar cho `/staff/*` với thanh indicator 2px x 20px.
- [x] **Image Storage**: Setup R2 Client, endpoint `/api/upload/presign` (có rate limit max 20 req/phút), component Upload Ảnh.
- [x] **Product Management (Admin & Staff)**:
  - Form thêm sản phẩm (Gen SKU, tự tính giá theo tier, nén ảnh client-side, tạo blurDataURL).
  - RPC `create_product` (Staff thêm -> `pending`, Admin thêm -> `approved`).
  - Màn hình duyệt sản phẩm cho Admin.
- [x] **POS (Bán hàng)**:
  - Grid sản phẩm (dùng partial index `idx_products_pos`, giảm opacity 0.4 cho hàng đã bán).
  - Giỏ hàng (State management bằng Zustand, gán theo `user_id` + `store_id`).
  - Logic gọi RPC `checkout_order` (Bắt buộc check `approval_status`, support `sale_price = 0`).
  - Xử lý Offline state: Cảnh báo mất mạng, disable nút checkout.

## Phase 3: Operations & Back-office
- [x] **Thu & Chi (Transactions)**: 
  - Auto-record Income từ đơn POS. 
  - Giao diện Admin nhập Chi (Expense) thủ công qua Bottom Sheet.
- [x] **Chấm công (Attendance)**:
  - Giao diện `/staff/attendance` cho nhân viên (Clock-in / out).
  - Xử lý timezone `Asia/Ho_Chi_Minh` cho `business_date` và `shift_date`.
- [x] **Order Management**: 
  - Danh sách đơn hàng cho Staff (`/staff/orders`).
  - Admin view tất cả đơn hàng & Gọi RPC `cancel_order` (hủy, lock đúng thứ tự, tự tạo return movement).
- [x] **Staff Profile & Dashboard**:
  - Giao diện xem doanh thu cá nhân cho Staff (`/staff/profile`).
  - Dashboard Admin: Revenue Cards, Stock Summary, Báo cáo theo `business_date`.

## Phase 4: Integrations, Background Jobs & PWA
- [x] **Cron Jobs**: Setup worker endpoint check header `CRON_SECRET` để dọn dẹp `reserved_until` mỗi 15 phút.
- [x] **Worker Queues**: Notification outbox & Invoice jobs (với logic retry exponential backoff, max 3 lần -> failed).
- [x] **In Ấn & Invoice**:
  - In Bill dạng Fallback (`window.print()`).
  - In Bluetooth ESC/POS (Cho thiết bị Android/Chrome - Phase 3+).
  - Generate PDF hóa đơn phía server qua thư viện PDF.
- [x] **PWA**: File `manifest.ts` và Service Worker (`sw.js`).

## MVP Verification (Definition of Done)
- [x] **Concurrency**: Checkout cùng 1 lúc 1 product trên 2 máy phải có 1 cái lỗi `PRODUCT_UNAVAILABLE`.
- [x] **Idempotency**: Gửi 2 request checkout cùng key phải trả về cùng Order ID, không bị double charge.
- [x] **Timezone Check**: Bán 1 đơn lúc 0h30 sáng VN, ngày ghi nhận phải là ngày hiện tại (không bị lùi về hôm trước do UTC).
- [x] **UI Review**: Không có border radius ở button, chỉ dùng viền 1px đen. Font số và SKU phải là JetBrains Mono, Header text trắng/nền đen full ink.
- [x] **Security**: Inspect code không lộ supabase service_role key ở frontend. Client thử chọc write vào bảng `transactions` phải bị database cản lại.
