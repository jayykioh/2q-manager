"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  business_date: string;
  created_at: string;
}

interface FinancialSummary {
  revenue: number;
  operating_expense: number;
  difference: number;
}

interface ReportPaymentMethod {
  payment_method: string;
  order_count: number;
  total_amount: number;
}

interface MonthlyReportSummary extends FinancialSummary {
  total_orders: number;
  paid_orders: number;
  cancelled_orders: number;
  total_items_sold: number;
  order_subtotal: number;
  order_discount: number;
  order_total: number;
  average_order_value: number;
  payment_methods?: ReportPaymentMethod[];
}

interface MonthlyReportDailyRevenue {
  business_date: string;
  order_count: number;
  cancelled_orders: number;
  items_sold: number;
  gross_sales: number;
  discount: number;
  net_sales: number;
  transaction_revenue: number;
  operating_expense: number;
  profit_before_payroll: number;
  cash_total: number;
  transfer_total: number;
  momo_total: number;
  vnpay_total: number;
  card_total: number;
}

interface MonthlyReportTransaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  status: string;
  amount: number;
  description: string | null;
  recorded_by_name: string | null;
  order_number: string | null;
  seller_name: string | null;
  payment_method: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_name: string | null;
  created_at: string;
}

interface MonthlyReportOrder {
  id: string;
  order_number: string;
  business_date: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  seller_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  item_count: number;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by_name: string | null;
}

interface MonthlyReportOrderItem {
  order_number: string;
  business_date: string;
  order_created_at: string;
  order_status: string;
  seller_name: string | null;
  payment_method: string;
  sku: string | null;
  product_name: string | null;
  product_type: string | null;
  product_tier: string | null;
  sale_price: number;
}

interface MonthlyReportAttendance {
  staff_name: string | null;
  store_name: string | null;
  shift_date: string;
  shift_type: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number;
  base_pay: number;
  bonus: number;
  total_pay: number;
  approved_at: string | null;
  approved_by_name: string | null;
  notes: string | null;
}

interface MonthlyReportStaffWorkday {
  staff_name: string | null;
  store_name: string | null;
  shift_date: string;
  scheduled_shifts: number;
  completed_shifts: number;
  approved_shifts: number;
  unapproved_shifts: number;
  first_check_in: string | null;
  last_check_out: string | null;
  hours_worked: number;
  base_pay: number;
  bonus: number;
  total_pay: number;
}

interface MonthlyReportStaff {
  name: string;
  role: string;
  total_orders: number;
  cancelled_orders: number;
  items_sold: number;
  gross_sales: number;
  discount: number;
  total_revenue: number;
  average_order_value: number;
  work_days: number;
  shifts_worked: number;
  hours_worked: number;
  base_pay: number;
  bonus: number;
  total_pay: number;
}

interface MonthlyReport {
  summary?: MonthlyReportSummary;
  daily_revenue?: MonthlyReportDailyRevenue[];
  transactions?: MonthlyReportTransaction[];
  orders?: MonthlyReportOrder[];
  order_items?: MonthlyReportOrderItem[];
  attendance?: MonthlyReportAttendance[];
  staff_workdays?: MonthlyReportStaffWorkday[];
  staff?: MonthlyReportStaff[];
}

type ExcelValue = string | number | boolean | Date | null | undefined;
type ExcelRow = Record<string, ExcelValue>;
type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

const MONEY_FORMAT = '#,##0 "VND"';
const NUMBER_FORMAT = "#,##0";
const HOURS_FORMAT = "0.00";

const appendStyledSheet = (
  wb: XLSX.WorkBook,
  sheetName: string,
  title: string,
  headers: string[],
  rows: ExcelRow[],
  widths: number[],
  options: {
    moneyHeaders?: string[];
    numberHeaders?: string[];
    decimalHeaders?: string[];
  } = {}
) => {
  const values = rows.map((row) => headers.map((header) => row[header] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...values]);
  const lastColumn = Math.max(headers.length - 1, 0);
  const lastRow = Math.max(rows.length + 2, 2);

  ws["!cols"] = headers.map((_, index) => ({ wch: widths[index] ?? 16 }));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } }];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: lastRow, c: lastColumn } }),
  };

  const titleCell = ws["A1"] as StyledCell | undefined;
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } };
  }

  headers.forEach((_, columnIndex) => {
    const address = XLSX.utils.encode_cell({ r: 2, c: columnIndex });
    const cell = ws[address] as StyledCell | undefined;
    if (cell) {
      cell.s = { font: { bold: true }, alignment: { horizontal: "center" } };
    }
  });

  const setFormat = (targetHeaders: string[] | undefined, format: string) => {
    if (!targetHeaders?.length) return;
    for (const header of targetHeaders) {
      const columnIndex = headers.indexOf(header);
      if (columnIndex === -1) continue;
      for (let rowIndex = 3; rowIndex <= lastRow; rowIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const cell = ws[address] as XLSX.CellObject | undefined;
        if (cell && typeof cell.v === "number") cell.z = format;
      }
    }
  };

  setFormat(options.moneyHeaders, MONEY_FORMAT);
  setFormat(options.numberHeaders, NUMBER_FORMAT);
  setFormat(options.decimalHeaders, HOURS_FORMAT);

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
};

const getMonthRange = (month: string) => {
  if (month === "all") return { startDate: null, endDate: null };

  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    startDate: `${month}-01`,
    endDate: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amountInput, setAmountInput] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Filters and Pagination
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [summary, setSummary] = useState<FinancialSummary>({
    revenue: 0,
    operating_expense: 0,
    difference: 0,
  });
  
  const [supabase] = useState(createClient);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, type, category, amount, description, business_date, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    
    setTransactions((data || []) as Transaction[]);
  }, [supabase]);

  const fetchFinancialSummary = useCallback(async () => {
    const { startDate, endDate } = getMonthRange(monthFilter);
    const { data, error } = await supabase
      .rpc("get_financial_summary", {
        p_start_date: startDate,
        p_end_date: endDate,
      })
      .single();

    if (error || !data) return;
    const financialSummary = data as FinancialSummary;
    setSummary({
      revenue: Number(financialSummary.revenue),
      operating_expense: Number(financialSummary.operating_expense),
      difference: Number(financialSummary.difference),
    });
  }, [monthFilter, supabase]);

  useEffect(() => {
    let active = true;
    void supabase
      .from("transactions")
      .select("id, type, category, amount, description, business_date, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setTransactions((data || []) as Transaction[]);
      });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const { startDate, endDate } = getMonthRange(monthFilter);
    void supabase
      .rpc("get_financial_summary", {
        p_start_date: startDate,
        p_end_date: endDate,
      })
      .single()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const financialSummary = data as FinancialSummary;
        setSummary({
          revenue: Number(financialSummary.revenue),
          operating_expense: Number(financialSummary.operating_expense),
          difference: Number(financialSummary.difference),
        });
      });
    return () => { active = false; };
  }, [monthFilter, supabase]);

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;

    const { error } = await supabase.rpc("record_expense", {
      p_store_id: "11111111-1111-1111-1111-111111111111",
      p_category: category,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã ghi nhận chi phí!");
      form.reset();
      setAmountInput("");
      await Promise.all([fetchTransactions(), fetchFinancialSummary()]);
    }
  };

  // Derived state for filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      
      // Month filter (YYYY-MM format check on created_at or business_date)
      if (monthFilter !== 'all') {
        const tMonth = t.business_date.substring(0, 7); // e.g. "2026-07"
        if (tMonth !== monthFilter) return false;
      }
      
      return true;
    });
  }, [transactions, typeFilter, monthFilter]);

  const displayedTransactions = filteredTransactions.slice(0, visibleCount);

  // Group displayed transactions by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of displayedTransactions) {
      const month = t.business_date.substring(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(t);
    }
    // Return sorted months descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [displayedTransactions]);

  // Generate unique months for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.business_date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      sale: "Bán hàng",
      import: "Nhập hàng",
      salary: "Lương Nhân Viên",
      marketing: "Marketing",
      shipping: "Shipping",
      rent: "Mặt bằng",
      other_expense: "Lặt vặt",
      order: "Đơn hàng",
    };
    return map[cat] || cat;
  };

  const paymentMethodLabel = (method: string | null | undefined) => {
    const map: Record<string, string> = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản",
      momo: "MoMo",
      vnpay: "VNPay",
      card: "Thẻ",
    };
    return method ? (map[method] || method) : "";
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("vi-VN");
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "";
    return new Date(value).toLocaleString("vi-VN");
  };

  const handleExportExcel = async () => {
    if (monthFilter === "all") {
      toast.error("Vui lòng chọn một tháng cụ thể để xuất báo cáo");
      return;
    }
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("get_monthly_report", {
        p_month: monthFilter,
      });

      if (error || !data) {
        toast.error("Lỗi khi tải dữ liệu báo cáo: " + (error?.message || ""));
        return;
      }

      const reportData = data as MonthlyReport;
      const summary: Partial<MonthlyReportSummary> = reportData.summary || {};
      const reportDailyRevenue = Array.isArray(reportData.daily_revenue) ? reportData.daily_revenue : [];
      const reportTransactions = Array.isArray(reportData.transactions) ? reportData.transactions : [];
      const reportOrders = Array.isArray(reportData.orders) ? reportData.orders : [];
      const reportOrderItems = Array.isArray(reportData.order_items) ? reportData.order_items : [];
      const reportAttendance = Array.isArray(reportData.attendance) ? reportData.attendance : [];
      const reportStaffWorkdays = Array.isArray(reportData.staff_workdays) ? reportData.staff_workdays : [];
      const reportStaff = Array.isArray(reportData.staff) ? reportData.staff : [];
      const paymentMethods = Array.isArray(summary.payment_methods) ? summary.payment_methods : [];
      const wb = XLSX.utils.book_new();

      // 1. Tổng Quan
      const summaryRows = [
        { "Chỉ mục": "Doanh thu", "Giá trị": summary.revenue ?? 0 },
        { "Chỉ mục": "Tổng tiền đơn hàng", "Giá trị": summary.order_total ?? 0 },
        { "Chỉ mục": "Tạm tính đơn hàng", "Giá trị": summary.order_subtotal ?? 0 },
        { "Chỉ mục": "Giảm giá đơn hàng", "Giá trị": summary.order_discount ?? 0 },
        { "Chỉ mục": "Chi phí vận hành", "Giá trị": summary.operating_expense ?? 0 },
        { "Chỉ mục": "Chênh lệch", "Giá trị": summary.difference ?? 0 },
        { "Chỉ mục": "Đơn hợp lệ", "Giá trị": summary.total_orders ?? 0 },
        { "Chỉ mục": "Đơn đã thanh toán", "Giá trị": summary.paid_orders ?? 0 },
        { "Chỉ mục": "Đơn đã hủy", "Giá trị": summary.cancelled_orders ?? 0 },
        { "Chỉ mục": "Sản phẩm đã bán", "Giá trị": summary.total_items_sold ?? 0 },
        { "Chỉ mục": "Giá trị đơn trung bình", "Giá trị": summary.average_order_value ?? 0 },
        ...paymentMethods.map((method) => ({
          "Chỉ mục": `Thanh toán ${paymentMethodLabel(method.payment_method)} (${method.order_count ?? 0} đơn)`,
          "Giá trị": method.total_amount ?? 0,
        })),
      ];
      appendStyledSheet(
        wb,
        "Tổng Quan",
        `Báo cáo tổng quan tháng ${monthFilter}`,
        ["Chỉ mục", "Giá trị"],
        summaryRows,
        [34, 20],
        { moneyHeaders: ["Giá trị"] }
      );

      // 2. Doanh Thu Theo Ngày
      const dailyRevenueRows = reportDailyRevenue.map((day) => ({
        "Ngày": formatDate(day.business_date),
        "Đơn hợp lệ": day.order_count,
        "Đơn hủy": day.cancelled_orders,
        "Sản phẩm bán": day.items_sold,
        "Tạm tính": day.gross_sales,
        "Giảm giá": day.discount,
        "Doanh thu đơn": day.net_sales,
        "Doanh thu giao dịch": day.transaction_revenue,
        "Chi phí": day.operating_expense,
        "Chênh lệch": day.profit_before_payroll,
        "Tiền mặt": day.cash_total,
        "Chuyển khoản": day.transfer_total,
        "MoMo": day.momo_total,
        "VNPay": day.vnpay_total,
        "Thẻ": day.card_total,
      }));
      appendStyledSheet(
        wb,
        "Doanh Thu Ngày",
        `Doanh thu theo ngày tháng ${monthFilter}`,
        [
          "Ngày",
          "Đơn hợp lệ",
          "Đơn hủy",
          "Sản phẩm bán",
          "Tạm tính",
          "Giảm giá",
          "Doanh thu đơn",
          "Doanh thu giao dịch",
          "Chi phí",
          "Chênh lệch",
          "Tiền mặt",
          "Chuyển khoản",
          "MoMo",
          "VNPay",
          "Thẻ",
        ],
        dailyRevenueRows,
        [13, 12, 10, 13, 16, 14, 17, 20, 15, 16, 15, 16, 14, 14, 14],
        {
          moneyHeaders: [
            "Tạm tính",
            "Giảm giá",
            "Doanh thu đơn",
            "Doanh thu giao dịch",
            "Chi phí",
            "Chênh lệch",
            "Tiền mặt",
            "Chuyển khoản",
            "MoMo",
            "VNPay",
            "Thẻ",
          ],
          numberHeaders: ["Đơn hợp lệ", "Đơn hủy", "Sản phẩm bán"],
        }
      );

      // 3. Doanh Thu Theo Nhân Viên
      const staffRevenueRows = reportStaff.map((s) => ({
        "Nhân viên": s.name,
        "Vai trò": s.role,
        "Đơn hợp lệ": s.total_orders,
        "Đơn hủy": s.cancelled_orders,
        "Sản phẩm bán": s.items_sold,
        "Tạm tính": s.gross_sales,
        "Giảm giá": s.discount,
        "Doanh số": s.total_revenue,
        "Giá trị đơn TB": s.average_order_value,
      }));
      appendStyledSheet(
        wb,
        "Doanh Thu NV",
        `Doanh thu theo nhân viên tháng ${monthFilter}`,
        ["Nhân viên", "Vai trò", "Đơn hợp lệ", "Đơn hủy", "Sản phẩm bán", "Tạm tính", "Giảm giá", "Doanh số", "Giá trị đơn TB"],
        staffRevenueRows,
        [24, 12, 12, 10, 13, 16, 14, 16, 16],
        {
          moneyHeaders: ["Tạm tính", "Giảm giá", "Doanh số", "Giá trị đơn TB"],
          numberHeaders: ["Đơn hợp lệ", "Đơn hủy", "Sản phẩm bán"],
        }
      );

      // 4. Giao Dịch
      const txs = reportTransactions.map((t) => ({
        "ID": t.id,
        "Ngày": formatDate(t.date),
        "Loại": t.type === "income" ? "Thu nhập" : "Chi tiêu",
        "Danh mục": categoryLabel(t.category),
        "Trạng thái": t.status,
        "Số tiền": t.amount,
        "Mô tả": t.description || "",
        "Người thực hiện": t.recorded_by_name || "",
        "Mã đơn": t.order_number || "",
        "Người bán": t.seller_name || "",
        "Thanh toán": paymentMethodLabel(t.payment_method),
        "Lý do hủy": t.cancel_reason || "",
        "Hủy lúc": formatDateTime(t.cancelled_at),
        "Người hủy": t.cancelled_by_name || "",
        "Tạo lúc": formatDateTime(t.created_at),
      }));
      appendStyledSheet(
        wb,
        "Giao Dịch",
        `Toàn bộ giao dịch tháng ${monthFilter}`,
        [
          "ID",
          "Ngày",
          "Loại",
          "Danh mục",
          "Trạng thái",
          "Số tiền",
          "Mô tả",
          "Người thực hiện",
          "Mã đơn",
          "Người bán",
          "Thanh toán",
          "Lý do hủy",
          "Hủy lúc",
          "Người hủy",
          "Tạo lúc",
        ],
        txs,
        [38, 13, 12, 16, 14, 16, 30, 22, 18, 22, 16, 28, 20, 22, 20],
        { moneyHeaders: ["Số tiền"] }
      );

      // 5. Đơn Hàng
      const orderRows = reportOrders.map((o) => ({
        "ID": o.id,
        "Mã đơn": o.order_number,
        "Ngày bán": formatDate(o.business_date),
        "Tạo lúc": formatDateTime(o.created_at),
        "Thanh toán lúc": formatDateTime(o.paid_at),
        "Trạng thái": o.status,
        "Người bán": o.seller_name || "",
        "Khách hàng": o.customer_name || "",
        "Số điện thoại": o.customer_phone || "",
        "Phương thức thanh toán": paymentMethodLabel(o.payment_method),
        "Tạm tính": o.subtotal,
        "Giảm giá": o.discount,
        "Tổng tiền": o.total,
        "Số sản phẩm": o.item_count,
        "Ghi chú": o.notes || "",
        "Hủy lúc": formatDateTime(o.cancelled_at),
        "Lý do hủy": o.cancel_reason || "",
        "Người hủy": o.cancelled_by_name || "",
      }));
      appendStyledSheet(
        wb,
        "Đơn Hàng",
        `Chi tiết đơn hàng tháng ${monthFilter}`,
        [
          "ID",
          "Mã đơn",
          "Ngày bán",
          "Tạo lúc",
          "Thanh toán lúc",
          "Trạng thái",
          "Người bán",
          "Khách hàng",
          "Số điện thoại",
          "Phương thức thanh toán",
          "Tạm tính",
          "Giảm giá",
          "Tổng tiền",
          "Số sản phẩm",
          "Ghi chú",
          "Hủy lúc",
          "Lý do hủy",
          "Người hủy",
        ],
        orderRows,
        [38, 18, 13, 20, 20, 14, 22, 22, 16, 22, 16, 14, 16, 13, 28, 20, 28, 22],
        {
          moneyHeaders: ["Tạm tính", "Giảm giá", "Tổng tiền"],
          numberHeaders: ["Số sản phẩm"],
        }
      );

      // 6. Sản Phẩm Đã Bán
      const itemRows = reportOrderItems.map((item) => ({
        "Mã đơn": item.order_number,
        "Ngày bán": formatDate(item.business_date),
        "Tạo lúc": formatDateTime(item.order_created_at),
        "Trạng thái đơn": item.order_status,
        "Người bán": item.seller_name || "",
        "Thanh toán": paymentMethodLabel(item.payment_method),
        "SKU": item.sku || "",
        "Sản phẩm": item.product_name || "",
        "Loại": item.product_type || "",
        "Phân hạng": item.product_tier || "",
        "Giá bán": item.sale_price,
      }));
      appendStyledSheet(
        wb,
        "Sản Phẩm Bán",
        `Chi tiết sản phẩm đã bán tháng ${monthFilter}`,
        ["Mã đơn", "Ngày bán", "Tạo lúc", "Trạng thái đơn", "Người bán", "Thanh toán", "SKU", "Sản phẩm", "Loại", "Phân hạng", "Giá bán"],
        itemRows,
        [18, 13, 20, 15, 22, 16, 16, 28, 14, 14, 16],
        { moneyHeaders: ["Giá bán"] }
      );

      // 7. Ngày Công Nhân Viên
      const workdayRows = reportStaffWorkdays.map((row) => ({
        "Nhân viên": row.staff_name || "",
        "Cửa hàng": row.store_name || "",
        "Ngày công": formatDate(row.shift_date),
        "Ca đã xếp": row.scheduled_shifts,
        "Ca hoàn tất": row.completed_shifts,
        "Ca đã duyệt": row.approved_shifts,
        "Ca chưa duyệt": row.unapproved_shifts,
        "Check-in đầu": formatDateTime(row.first_check_in),
        "Check-out cuối": formatDateTime(row.last_check_out),
        "Số giờ làm": row.hours_worked,
        "Lương cơ bản": row.base_pay,
        "Thưởng": row.bonus,
        "Tổng lương": row.total_pay,
      }));
      appendStyledSheet(
        wb,
        "Ngày Công NV",
        `Ngày công nhân viên tháng ${monthFilter}`,
        [
          "Nhân viên",
          "Cửa hàng",
          "Ngày công",
          "Ca đã xếp",
          "Ca hoàn tất",
          "Ca đã duyệt",
          "Ca chưa duyệt",
          "Check-in đầu",
          "Check-out cuối",
          "Số giờ làm",
          "Lương cơ bản",
          "Thưởng",
          "Tổng lương",
        ],
        workdayRows,
        [24, 22, 13, 11, 12, 12, 13, 20, 20, 13, 16, 14, 16],
        {
          moneyHeaders: ["Lương cơ bản", "Thưởng", "Tổng lương"],
          numberHeaders: ["Ca đã xếp", "Ca hoàn tất", "Ca đã duyệt", "Ca chưa duyệt"],
          decimalHeaders: ["Số giờ làm"],
        }
      );

      // 8. Chấm Công
      const attendanceRows = reportAttendance.map((row) => ({
        "Nhân viên": row.staff_name || "",
        "Cửa hàng": row.store_name || "",
        "Ngày ca": formatDate(row.shift_date),
        "Loại ca": row.shift_type,
        "Check-in": formatDateTime(row.check_in),
        "Check-out": formatDateTime(row.check_out),
        "Số giờ làm": row.hours_worked,
        "Lương cơ bản": row.base_pay,
        "Thưởng": row.bonus,
        "Tổng lương": row.total_pay,
        "Trạng thái duyệt": row.approved_at ? "Đã duyệt" : "Chưa duyệt",
        "Duyệt lúc": formatDateTime(row.approved_at),
        "Người duyệt": row.approved_by_name || "",
        "Ghi chú": row.notes || "",
      }));
      appendStyledSheet(
        wb,
        "Chấm Công",
        `Chi tiết ca làm tháng ${monthFilter}`,
        [
          "Nhân viên",
          "Cửa hàng",
          "Ngày ca",
          "Loại ca",
          "Check-in",
          "Check-out",
          "Số giờ làm",
          "Lương cơ bản",
          "Thưởng",
          "Tổng lương",
          "Trạng thái duyệt",
          "Duyệt lúc",
          "Người duyệt",
          "Ghi chú",
        ],
        attendanceRows,
        [24, 22, 13, 13, 20, 20, 13, 16, 14, 16, 17, 20, 22, 28],
        {
          moneyHeaders: ["Lương cơ bản", "Thưởng", "Tổng lương"],
          decimalHeaders: ["Số giờ làm"],
        }
      );

      // 9. Nhân Viên
      const staff = reportStaff.map((s) => ({
        "Nhân viên": s.name,
        "Vai trò": s.role,
        "Tổng số đơn": s.total_orders,
        "Đơn hủy": s.cancelled_orders,
        "Sản phẩm bán": s.items_sold,
        "Tạm tính": s.gross_sales,
        "Giảm giá": s.discount,
        "Doanh số": s.total_revenue,
        "Giá trị đơn TB": s.average_order_value,
        "Ngày công": s.work_days,
        "Số ca làm": s.shifts_worked,
        "Số giờ làm": s.hours_worked,
        "Lương cơ bản": s.base_pay,
        "Thưởng": s.bonus,
        "Tổng lương": s.total_pay,
      }));
      appendStyledSheet(
        wb,
        "Nhân Viên",
        `Tổng hợp nhân viên tháng ${monthFilter}`,
        [
          "Nhân viên",
          "Vai trò",
          "Tổng số đơn",
          "Đơn hủy",
          "Sản phẩm bán",
          "Tạm tính",
          "Giảm giá",
          "Doanh số",
          "Giá trị đơn TB",
          "Ngày công",
          "Số ca làm",
          "Số giờ làm",
          "Lương cơ bản",
          "Thưởng",
          "Tổng lương",
        ],
        staff,
        [24, 12, 12, 10, 13, 16, 14, 16, 16, 12, 12, 13, 16, 14, 16],
        {
          moneyHeaders: ["Tạm tính", "Giảm giá", "Doanh số", "Giá trị đơn TB", "Lương cơ bản", "Thưởng", "Tổng lương"],
          numberHeaders: ["Tổng số đơn", "Đơn hủy", "Sản phẩm bán", "Ngày công", "Số ca làm"],
          decimalHeaders: ["Số giờ làm"],
        }
      );

      XLSX.writeFile(wb, `BaoCao_${monthFilter}.xlsx`);
      toast.success("Xuất file Excel thành công!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Đã xảy ra lỗi: " + message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <h2 className="font-sans text-xl font-medium">Lịch sử Thu Chi</h2>
        </div>
        
        <div className="flex gap-2 text-sm">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>

          <select 
            value={monthFilter} 
            onChange={e => { setMonthFilter(e.target.value); setVisibleCount(10); }}
            className="p-2 border border-rule bg-paper"
          >
            <option value="all">Tất cả tháng</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          
          <select 
            value={typeFilter} 
            onChange={e => { setTypeFilter(e.target.value); setVisibleCount(10); }}
            className="p-2 border border-rule bg-paper"
          >
            <option value="all">Tất cả thu/chi</option>
            <option value="income">Chỉ Thu Nhập</option>
            <option value="expense">Chỉ Chi Tiêu</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1px] bg-rule border border-rule mb-6">
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Doanh thu</div>
            <div className="font-mono text-base md:text-lg text-green-600">{summary.revenue.toLocaleString()}đ</div>
          </div>
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Chi vận hành</div>
            <div className="font-mono text-base md:text-lg text-destructive">{summary.operating_expense.toLocaleString()}đ</div>
          </div>
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Chênh lệch</div>
            <div className="font-mono text-base md:text-lg font-medium">{summary.difference.toLocaleString()}đ</div>
          </div>
        </div>

        <div className="space-y-6">
          {displayedTransactions.length === 0 && (
            <div className="text-center p-4 text-mid">Không có giao dịch nào.</div>
          )}
          {groupedByMonth.map(([month, txs]) => {
            const [year, mon] = month.split("-");
            return (
              <div key={month}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-mid uppercase tracking-wider">
                    Tháng {mon}/{year}
                  </span>
                  <div className="flex-1 h-px bg-rule" />
                  <span className="text-xs text-mid">{txs.length} giao dịch</span>
                </div>
                <div className="space-y-2">
                  {txs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTransaction(t)}
                      className="w-full bg-paper border border-rule p-3 flex justify-between items-center text-left hover:bg-surface transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">
                          {t.description || "Giao dịch"}
                        </div>
                        <div className="text-sm text-mid uppercase">
                          <span>{categoryLabel(t.category)}</span>
                        </div>
                        <div className="text-xs text-mid">{new Date(t.created_at).toLocaleString("vi-VN")}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`font-mono ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}đ
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          
          {visibleCount < filteredTransactions.length && (
            <button 
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="w-full py-2 bg-surface hover:bg-surface-hover border border-rule mt-4 text-sm font-medium transition-colors"
            >
              Xem thêm ({filteredTransactions.length - visibleCount} giao dịch)
            </button>
          )}
        </div>
      </div>
      
      <div className="w-full md:w-96 mb-6 md:mb-0">
        <form onSubmit={handleAddExpense} className="bg-surface border border-rule p-4 space-y-4">
          <h3 className="font-medium text-lg">Ghi nhận Chi phí</h3>
          <div>
            <label className="block text-sm mb-1">Loại chi</label>
            <select name="category" className="w-full p-2 border border-rule bg-paper">
              <option value="import">Nhập hàng</option>
              <option value="salary">Lương Nhân Viên</option>
              <option value="marketing">Marketing</option>
              <option value="shipping">Shipping</option>
              <option value="rent">Mặt bằng</option>
              <option value="other_expense">Lặt vặt</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Số tiền (VNĐ)</label>
            <input 
              name="amount" 
              type="number" 
              required 
              min="0" 
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full p-2 border border-rule font-mono" 
            />
            {amountInput && Number(amountInput) > 0 && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setAmountInput(amountInput + "000")} className="text-xs px-2 py-1 bg-surface border border-rule rounded hover:bg-paper cursor-pointer transition-colors">
                  +{Number(amountInput + "000").toLocaleString()}đ
                </button>
                <button type="button" onClick={() => setAmountInput(amountInput + "000000")} className="text-xs px-2 py-1 bg-surface border border-rule rounded hover:bg-paper cursor-pointer transition-colors">
                  +{Number(amountInput + "000000").toLocaleString()}đ
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Mô tả</label>
            <input name="description" required className="w-full p-2 border border-rule" />
          </div>
          <button type="submit" className="w-full bg-ink text-paper py-2 uppercase font-medium tracking-wider hover:opacity-90 transition-opacity">
            Lưu khoản chi
          </button>
        </form>
      </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="bg-paper border border-rule w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-lg">Chi tiết giao dịch</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-mid hover:text-ink text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mid">Loại</span>
                <span className={`font-medium ${selectedTransaction.type === "income" ? "text-green-600" : "text-destructive"}`}>
                  {selectedTransaction.type === "income" ? "Thu nhập" : "Chi tiêu"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mid">Danh mục</span>
                <span className="font-medium uppercase">{categoryLabel(selectedTransaction.category)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mid">Số tiền</span>
                <span className={`font-mono font-medium text-base ${selectedTransaction.type === "income" ? "text-green-600" : "text-destructive"}`}>
                  {selectedTransaction.type === "income" ? "+" : "-"}{selectedTransaction.amount.toLocaleString()}đ
                </span>
              </div>
              {selectedTransaction.description && (
                <div className="flex justify-between gap-4">
                  <span className="text-mid shrink-0">Mô tả</span>
                  <span className="text-right">{selectedTransaction.description}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-mid">Ngày giao dịch</span>
                <span>{new Date(selectedTransaction.business_date).toLocaleDateString("vi-VN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mid">Tạo lúc</span>
                <span>{new Date(selectedTransaction.created_at).toLocaleString("vi-VN")}</span>
              </div>
              <div className="pt-1 border-t border-rule">
                <span className="text-xs text-mid font-mono break-all">ID: {selectedTransaction.id}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full py-2 bg-surface border border-rule text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
