"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  status: string;
  cancel_reason: string | null;
  business_date: string;
  created_at: string;
}

interface FinancialSummary {
  revenue: number;
  operating_expense: number;
  difference: number;
}

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
      .select("id, type, category, amount, description, status, cancel_reason, business_date, created_at")
      .eq("entry_kind", "regular")
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
      .select("id, type, category, amount, description, status, cancel_reason, business_date, created_at")
      .eq("entry_kind", "regular")
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

  // Generate unique months for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.business_date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <h2 className="font-sans text-xl font-medium">Lịch sử Thu Chi</h2>
        </div>
        
        <div className="flex gap-2 text-sm">
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

        <div className="space-y-2">
          {displayedTransactions.length === 0 && (
            <div className="text-center p-4 text-mid">Không có giao dịch nào.</div>
          )}
          {displayedTransactions.map((t) => {
            const isCancelled = t.status === 'cancelled';
            return (
              <div key={t.id} className={`bg-paper border border-rule p-3 flex justify-between items-center ${isCancelled ? 'opacity-60' : ''}`}>
                <div>
                  <div className={`font-medium ${isCancelled ? 'line-through text-mid' : ''}`}>
                    {t.description || "Giao dịch"}
                  </div>
                  <div className="text-sm text-mid uppercase flex items-center gap-2">
                    <span>{t.category}</span>
                    {isCancelled && <span className="bg-destructive/10 text-destructive px-1 rounded text-[10px] font-bold">ĐÃ HUỶ</span>}
                  </div>
                  <div className="text-xs text-mid">{new Date(t.created_at).toLocaleString()}</div>
                  {isCancelled && t.cancel_reason && (
                    <div className="text-xs text-destructive mt-1">Lý do: {t.cancel_reason}</div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className={`font-mono ${isCancelled ? 'line-through text-mid' : (t.type === 'income' ? 'text-green-600' : 'text-destructive')}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}đ
                  </div>
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
    </div>
  );
}
