# Bao Cao & Trich Xuat Excel (Excel Export Feature)

## 1. Muc tieu V2.1

File Excel thang phai du chi tiet de admin doi soat:

- Doanh thu tong quan, doanh thu theo ngay, doanh thu theo nhan vien.
- Toan bo giao dich trong thang, gom ca giao dich da huy de audit.
- Don hang nao do nhan vien nao ban, khach thanh toan bang phuong thuc nao.
- Tung san pham trong don duoc ban voi gia nao.
- Nhan vien lam ngay nao, ca nao, bao nhieu gio.
- Nhan vien co bao nhieu tien luong trong thang theo du lieu cham cong.

V2.1 khong them hoa hong. Tien cua nhan vien trong bao cao la `base_pay + bonus` tu bang `attendance`, con doanh so ban hang duoc hien thi rieng de doi soat hieu suat.

## 2. Nguon du lieu

Backend dung Supabase RPC `get_monthly_report(p_month TEXT)` trong `supabase/migrations/0033_monthly_report_rpc.sql`.

Nguyen tac loc thang:

- `orders` va `transactions` dung `business_date`.
- `attendance` dung `shift_date`.
- Khong dung `created_at::date` de tranh lech mui gio.

Quyen truy cap:

- Chi admin duoc goi RPC.
- RPC giu `SECURITY DEFINER`, `SET search_path = ''`, va schema-qualify moi bang.

## 3. JSON Contract

RPC tra ve mot object JSON gom:

- `summary`: revenue, operating expense, difference, order subtotal/discount/total, average order value, order counts, item count, va tong tien theo phuong thuc thanh toan.
- `daily_revenue`: mot dong moi ngay co du lieu, gom so don, so san pham, gross sales, discount, net sales, transaction revenue, expense, difference, va tong theo cash/transfer/momo/vnpay/card.
- `transactions`: toan bo giao dich trong thang, gom status, nguoi ghi nhan, don lien quan, nguoi ban, payment method, thong tin huy neu co.
- `orders`: mot dong moi don hang trong thang, gom customer, seller, payment method, subtotal, discount, total, item count, status va thong tin huy.
- `order_items`: mot dong moi san pham trong don, gom ma don, seller, SKU, ten san pham, type, tier va sale price.
- `attendance`: mot dong moi ca lam, gom staff, store, shift date/type, check-in/out, hours, base pay, bonus, total pay va approval status.
- `staff_workdays`: mot dong moi nhan vien moi ngay cong, gom so ca xep, so ca hoan tat, so ca da/chua duyet, first check-in, last check-out, hours va pay.
- `staff`: tong hop theo nhan vien, gom order count, cancelled count, items sold, gross sales, discount, revenue, average order value, work days, shifts, hours, base pay, bonus va total pay.

## 4. Excel Workbook

Frontend tai `app/(authenticated)/admin/transactions/page.tsx` dung `xlsx` de tao workbook voi 9 sheet:

1. `Tong Quan`
2. `Doanh Thu Ngay`
3. `Doanh Thu NV`
4. `Giao Dich`
5. `Don Hang`
6. `San Pham Ban`
7. `Ngay Cong NV`
8. `Cham Cong`
9. `Nhan Vien`

Moi sheet co title row, filter row, column widths, va format so tien/gio lam. Cac mang rong van xuat duoc sheet rong thay vi crash. Cac truong optional nhu customer, notes, cancel info, check-out hoac approved_at duoc ghi chuoi rong khi chua co du lieu.

Ghi chu ve styling: thu vien `xlsx` hien tai ho tro tot column width, autofilter, merged title va number formats. Mau nen, border, font style co the duoc gan trong object sheet nhung ban community cua `xlsx` khong dam bao render day du trong file xuat ra. Neu can style mau/border chuan Excel, can doi sang package nhu `xlsx-js-style`.

## 5. Quy tac tinh toan

- Doanh thu/chi phi/chenh lech lay tu `transactions` co `status = 'completed'`.
- Order subtotal/discount/total lay tu `orders` co `status <> 'cancelled'`.
- Sheet `Giao Dich` van liet ke ca giao dich da huy trong thang de audit.
- Don hop le la `orders.status <> 'cancelled'`.
- Doanh so theo nhan vien lay tu tong `orders.total` cua don hop le do nhan vien tao (`orders.created_by`).
- `work_days` la so ngay co attendance da `check_out`.
- So ca, gio lam, luong co ban va thuong chi cong cac dong attendance da co `check_out`.
- Tong luong nhan vien la `base_pay + bonus`, khong bao gom doanh so va khong bao gom hoa hong.

## 6. Kiem thu can co

- Admin export thang co don paid, don cancelled, chi phi thu cong, chi luong va nhieu nhan vien.
- Staff/non-admin goi `get_monthly_report` bi chan bang `ADMIN_REQUIRED`.
- Du lieu sat ranh gioi thang van dung theo `business_date` va `shift_date`.
- Thang khong co du lieu van export duoc du sheet voi header/filter.
- Export khong lam thay doi filter/list giao dich hien tai tren man hinh Thu Chi.
