-- Migration: Monthly Excel Report RPC

CREATE OR REPLACE FUNCTION public.get_monthly_report(
  p_month TEXT -- 'YYYY-MM'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.user_role;
  v_start_date DATE;
  v_end_date DATE;
  v_summary JSONB;
  v_daily_revenue JSONB;
  v_transactions JSONB;
  v_orders JSONB;
  v_order_items JSONB;
  v_attendance JSONB;
  v_staff_workdays JSONB;
  v_staff JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  v_start_date := (p_month || '-01')::DATE;
  v_end_date := v_start_date + INTERVAL '1 month';

  -- 1. Financial and sales summary.
  WITH transaction_totals AS (
    SELECT
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'income'
      ), 0) AS revenue,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.status = 'completed' AND t.type = 'expense'
      ), 0) AS expense
    FROM public.transactions t
    WHERE t.business_date >= v_start_date
      AND t.business_date < v_end_date
  ),
  order_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS total_orders,
      COUNT(*) FILTER (WHERE o.status = 'paid') AS paid_orders,
      COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
      COALESCE(SUM(o.subtotal) FILTER (WHERE o.status <> 'cancelled'), 0) AS order_subtotal,
      COALESCE(SUM(o.discount) FILTER (WHERE o.status <> 'cancelled'), 0) AS order_discount,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS order_total,
      COALESCE(ROUND(AVG(o.total) FILTER (WHERE o.status <> 'cancelled'), 0), 0) AS average_order_value
    FROM public.orders o
    WHERE o.business_date >= v_start_date
      AND o.business_date < v_end_date
  ),
  item_totals AS (
    SELECT COUNT(*) AS total_items_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status <> 'cancelled'
      AND o.business_date >= v_start_date
      AND o.business_date < v_end_date
  ),
  payment_totals AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'payment_method', payment_method,
        'order_count', order_count,
        'total_amount', total_amount
      ) ORDER BY payment_method
    ), '[]'::jsonb) AS payment_methods
    FROM (
      SELECT
        o.payment_method::TEXT AS payment_method,
        COUNT(*) AS order_count,
        COALESCE(SUM(o.total), 0) AS total_amount
      FROM public.orders o
      WHERE o.status <> 'cancelled'
        AND o.business_date >= v_start_date
        AND o.business_date < v_end_date
      GROUP BY o.payment_method
    ) methods
  )
  SELECT jsonb_build_object(
    'revenue', transaction_totals.revenue,
    'operating_expense', transaction_totals.expense,
    'difference', transaction_totals.revenue - transaction_totals.expense,
    'total_orders', order_totals.total_orders,
    'paid_orders', order_totals.paid_orders,
    'cancelled_orders', order_totals.cancelled_orders,
    'total_items_sold', item_totals.total_items_sold,
    'order_subtotal', order_totals.order_subtotal,
    'order_discount', order_totals.order_discount,
    'order_total', order_totals.order_total,
    'average_order_value', order_totals.average_order_value,
    'payment_methods', payment_totals.payment_methods
  )
  INTO v_summary
  FROM transaction_totals
  CROSS JOIN order_totals
  CROSS JOIN item_totals
  CROSS JOIN payment_totals;

  -- 1b. Daily revenue detail for the workbook.
  WITH report_dates AS (
    SELECT o.business_date
    FROM public.orders o
    WHERE o.business_date >= v_start_date
      AND o.business_date < v_end_date
    UNION
    SELECT t.business_date
    FROM public.transactions t
    WHERE t.business_date >= v_start_date
      AND t.business_date < v_end_date
  ),
  order_daily AS (
    SELECT
      o.business_date,
      COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS order_count,
      COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
      COALESCE(SUM(o.subtotal) FILTER (WHERE o.status <> 'cancelled'), 0) AS gross_sales,
      COALESCE(SUM(o.discount) FILTER (WHERE o.status <> 'cancelled'), 0) AS discount,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS net_sales,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled' AND o.payment_method = 'cash'), 0) AS cash_total,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled' AND o.payment_method = 'transfer'), 0) AS transfer_total,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled' AND o.payment_method = 'momo'), 0) AS momo_total,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled' AND o.payment_method = 'vnpay'), 0) AS vnpay_total,
      COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled' AND o.payment_method = 'card'), 0) AS card_total
    FROM public.orders o
    WHERE o.business_date >= v_start_date
      AND o.business_date < v_end_date
    GROUP BY o.business_date
  ),
  item_daily AS (
    SELECT
      o.business_date,
      COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS items_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.business_date >= v_start_date
      AND o.business_date < v_end_date
    GROUP BY o.business_date
  ),
  transaction_daily AS (
    SELECT
      t.business_date,
      COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'completed' AND t.type = 'income'), 0) AS transaction_revenue,
      COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'completed' AND t.type = 'expense'), 0) AS operating_expense
    FROM public.transactions t
    WHERE t.business_date >= v_start_date
      AND t.business_date < v_end_date
    GROUP BY t.business_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'business_date', d.business_date,
      'order_count', COALESCE(od.order_count, 0),
      'cancelled_orders', COALESCE(od.cancelled_orders, 0),
      'items_sold', COALESCE(id.items_sold, 0),
      'gross_sales', COALESCE(od.gross_sales, 0),
      'discount', COALESCE(od.discount, 0),
      'net_sales', COALESCE(od.net_sales, 0),
      'transaction_revenue', COALESCE(td.transaction_revenue, 0),
      'operating_expense', COALESCE(td.operating_expense, 0),
      'profit_before_payroll', COALESCE(td.transaction_revenue, 0) - COALESCE(td.operating_expense, 0),
      'cash_total', COALESCE(od.cash_total, 0),
      'transfer_total', COALESCE(od.transfer_total, 0),
      'momo_total', COALESCE(od.momo_total, 0),
      'vnpay_total', COALESCE(od.vnpay_total, 0),
      'card_total', COALESCE(od.card_total, 0)
    ) ORDER BY d.business_date
  ), '[]'::jsonb)
  INTO v_daily_revenue
  FROM report_dates d
  LEFT JOIN order_daily od ON od.business_date = d.business_date
  LEFT JOIN item_daily id ON id.business_date = d.business_date
  LEFT JOIN transaction_daily td ON td.business_date = d.business_date;

  -- 2. All transactions in the selected business month.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'date', t.business_date,
      'type', t.type,
      'category', t.category,
      'status', t.status,
      'amount', t.amount,
      'description', t.description,
      'recorded_by_name', recorder.full_name,
      'order_id', o.id,
      'order_number', o.order_number,
      'seller_name', seller.full_name,
      'payment_method', o.payment_method,
      'cancel_reason', t.cancel_reason,
      'cancelled_at', t.cancelled_at,
      'cancelled_by_name', canceller.full_name,
      'created_at', t.created_at
    ) ORDER BY t.business_date DESC, t.created_at DESC, t.id
  ), '[]'::jsonb)
  INTO v_transactions
  FROM public.transactions t
  LEFT JOIN public.profiles recorder ON recorder.id = t.recorded_by
  LEFT JOIN public.orders o ON o.id = t.order_id
  LEFT JOIN public.profiles seller ON seller.id = o.created_by
  LEFT JOIN public.profiles canceller ON canceller.id = t.cancelled_by
  WHERE t.business_date >= v_start_date
    AND t.business_date < v_end_date;

  -- 3. One row per order, including seller and payment details.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'business_date', o.business_date,
      'created_at', o.created_at,
      'paid_at', o.paid_at,
      'status', o.status,
      'seller_name', seller.full_name,
      'customer_name', o.customer_name,
      'customer_phone', o.customer_phone,
      'payment_method', o.payment_method,
      'subtotal', o.subtotal,
      'discount', o.discount,
      'total', o.total,
      'notes', o.notes,
      'item_count', COALESCE(items.item_count, 0),
      'cancelled_at', o.cancelled_at,
      'cancel_reason', o.cancel_reason,
      'cancelled_by_name', canceller.full_name
    ) ORDER BY o.business_date DESC, o.created_at DESC, o.order_number
  ), '[]'::jsonb)
  INTO v_orders
  FROM public.orders o
  LEFT JOIN public.profiles seller ON seller.id = o.created_by
  LEFT JOIN public.profiles canceller ON canceller.id = o.cancelled_by
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS item_count
    FROM public.order_items oi
    WHERE oi.order_id = o.id
  ) items ON TRUE
  WHERE o.business_date >= v_start_date
    AND o.business_date < v_end_date;

  -- 4. One row per sold product/order item.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'order_number', o.order_number,
      'business_date', o.business_date,
      'order_created_at', o.created_at,
      'order_status', o.status,
      'seller_name', seller.full_name,
      'payment_method', o.payment_method,
      'product_id', product.id,
      'sku', product.sku,
      'product_name', product.name,
      'product_type', product.type,
      'product_tier', product.tier,
      'sale_price', oi.sale_price
    ) ORDER BY o.business_date DESC, o.created_at DESC, product.sku
  ), '[]'::jsonb)
  INTO v_order_items
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  LEFT JOIN public.products product ON product.id = oi.product_id
  LEFT JOIN public.profiles seller ON seller.id = o.created_by
  WHERE o.business_date >= v_start_date
    AND o.business_date < v_end_date;

  -- 5. One row per attendance shift in the selected shift month.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'staff_name', staff.full_name,
      'store_name', store.name,
      'shift_date', a.shift_date,
      'shift_type', a.shift_type,
      'check_in', a.check_in,
      'check_out', a.check_out,
      'hours_worked', COALESCE(a.hours_worked, 0),
      'base_pay', COALESCE(a.base_pay, 0),
      'bonus', COALESCE(a.bonus, 0),
      'total_pay', COALESCE(a.base_pay, 0) + COALESCE(a.bonus, 0),
      'approved_at', a.approved_at,
      'approved_by_name', approver.full_name,
      'notes', a.notes
    ) ORDER BY a.shift_date DESC, staff.full_name, a.shift_type
  ), '[]'::jsonb)
  INTO v_attendance
  FROM public.attendance a
  LEFT JOIN public.profiles staff ON staff.id = a.staff_id
  LEFT JOIN public.stores store ON store.id = a.store_id
  LEFT JOIN public.profiles approver ON approver.id = a.approved_by
  WHERE a.shift_date >= v_start_date
    AND a.shift_date < v_end_date;

  -- 5b. One row per staff work day.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'staff_name', workday.staff_name,
      'store_name', workday.store_name,
      'shift_date', workday.shift_date,
      'scheduled_shifts', workday.scheduled_shifts,
      'completed_shifts', workday.completed_shifts,
      'approved_shifts', workday.approved_shifts,
      'unapproved_shifts', workday.unapproved_shifts,
      'first_check_in', workday.first_check_in,
      'last_check_out', workday.last_check_out,
      'hours_worked', workday.hours_worked,
      'base_pay', workday.base_pay,
      'bonus', workday.bonus,
      'total_pay', workday.total_pay
    ) ORDER BY workday.shift_date DESC, workday.staff_name
  ), '[]'::jsonb)
  INTO v_staff_workdays
  FROM (
    SELECT
      staff.full_name AS staff_name,
      store.name AS store_name,
      a.shift_date,
      COUNT(*) AS scheduled_shifts,
      COUNT(*) FILTER (WHERE a.check_out IS NOT NULL) AS completed_shifts,
      COUNT(*) FILTER (WHERE a.approved_at IS NOT NULL) AS approved_shifts,
      COUNT(*) FILTER (WHERE a.approved_at IS NULL) AS unapproved_shifts,
      MIN(a.check_in) AS first_check_in,
      MAX(a.check_out) AS last_check_out,
      COALESCE(SUM(a.hours_worked) FILTER (WHERE a.check_out IS NOT NULL), 0) AS hours_worked,
      COALESCE(SUM(a.base_pay) FILTER (WHERE a.check_out IS NOT NULL), 0) AS base_pay,
      COALESCE(SUM(a.bonus) FILTER (WHERE a.check_out IS NOT NULL), 0) AS bonus,
      COALESCE(SUM(a.base_pay) FILTER (WHERE a.check_out IS NOT NULL), 0)
        + COALESCE(SUM(a.bonus) FILTER (WHERE a.check_out IS NOT NULL), 0) AS total_pay
    FROM public.attendance a
    LEFT JOIN public.profiles staff ON staff.id = a.staff_id
    LEFT JOIN public.stores store ON store.id = a.store_id
    WHERE a.shift_date >= v_start_date
      AND a.shift_date < v_end_date
    GROUP BY staff.full_name, store.name, a.shift_date
  ) workday;

  -- 6. Staff summary: sales are order-created totals; pay is attendance payroll.
  WITH staff_stats AS (
    SELECT
      p.id AS staff_id,
      p.full_name,
      p.role,
      COALESCE(order_stats.total_orders, 0) AS total_orders,
      COALESCE(order_stats.cancelled_orders, 0) AS cancelled_orders,
      COALESCE(order_stats.items_sold, 0) AS items_sold,
      COALESCE(order_stats.gross_sales, 0) AS gross_sales,
      COALESCE(order_stats.discount, 0) AS discount,
      COALESCE(order_stats.total_revenue, 0) AS total_revenue,
      COALESCE(order_stats.average_order_value, 0) AS average_order_value,
      COALESCE(attendance_stats.work_days, 0) AS work_days,
      COALESCE(attendance_stats.shifts_worked, 0) AS shifts_worked,
      COALESCE(attendance_stats.hours_worked, 0) AS hours_worked,
      COALESCE(attendance_stats.base_pay, 0) AS base_pay,
      COALESCE(attendance_stats.bonus, 0) AS bonus
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS total_orders,
        COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
        COALESCE(SUM(o.subtotal) FILTER (WHERE o.status <> 'cancelled'), 0) AS gross_sales,
        COALESCE(SUM(o.discount) FILTER (WHERE o.status <> 'cancelled'), 0) AS discount,
        COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS total_revenue,
        COALESCE(ROUND(AVG(o.total) FILTER (WHERE o.status <> 'cancelled'), 0), 0) AS average_order_value,
        (
          SELECT COUNT(*)
          FROM public.order_items oi
          JOIN public.orders item_order ON item_order.id = oi.order_id
          WHERE item_order.created_by = p.id
            AND item_order.status <> 'cancelled'
            AND item_order.business_date >= v_start_date
            AND item_order.business_date < v_end_date
        ) AS items_sold
      FROM public.orders o
      WHERE o.created_by = p.id
        AND o.business_date >= v_start_date
        AND o.business_date < v_end_date
    ) order_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(DISTINCT a.shift_date) FILTER (WHERE a.check_out IS NOT NULL) AS work_days,
        COUNT(*) FILTER (WHERE a.check_out IS NOT NULL) AS shifts_worked,
        COALESCE(SUM(a.hours_worked) FILTER (WHERE a.check_out IS NOT NULL), 0) AS hours_worked,
        COALESCE(SUM(a.base_pay) FILTER (WHERE a.check_out IS NOT NULL), 0) AS base_pay,
        COALESCE(SUM(a.bonus) FILTER (WHERE a.check_out IS NOT NULL), 0) AS bonus
      FROM public.attendance a
      WHERE a.staff_id = p.id
        AND a.shift_date >= v_start_date
        AND a.shift_date < v_end_date
    ) attendance_stats ON TRUE
    WHERE p.is_active = TRUE
      OR COALESCE(order_stats.total_orders, 0) > 0
      OR COALESCE(attendance_stats.shifts_worked, 0) > 0
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', full_name,
      'role', role,
      'total_orders', total_orders,
      'cancelled_orders', cancelled_orders,
      'items_sold', items_sold,
      'gross_sales', gross_sales,
      'discount', discount,
      'total_revenue', total_revenue,
      'average_order_value', average_order_value,
      'work_days', work_days,
      'shifts_worked', shifts_worked,
      'hours_worked', hours_worked,
      'base_pay', base_pay,
      'bonus', bonus,
      'total_pay', base_pay + bonus
    ) ORDER BY role, full_name
  ), '[]'::jsonb)
  INTO v_staff
  FROM staff_stats;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'daily_revenue', v_daily_revenue,
    'transactions', v_transactions,
    'orders', v_orders,
    'order_items', v_order_items,
    'attendance', v_attendance,
    'staff_workdays', v_staff_workdays,
    'staff', v_staff
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_report(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_report(TEXT) TO authenticated;
