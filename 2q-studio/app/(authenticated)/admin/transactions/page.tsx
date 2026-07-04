"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import Link from "next/link";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  status: string;
  cancel_reason: string | null;
  order_id: string | null;
  entry_kind: "regular" | "refund";
  business_date: string;
  created_at: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amountInput, setAmountInput] = useState<string>("");
  
  // Filters and Pagination
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(10);
  
  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  
  const [supabase] = useState(createClient);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, type, category, amount, description, status, cancel_reason, order_id, entry_kind, business_date, created_at")
      .order("created_at", { ascending: false });
    
    setTransactions((data || []) as Transaction[]);
  };

  useEffect(() => {
    let active = true;
    void supabase
      .from("transactions")
      .select("id, type, category, amount, description, status, cancel_reason, order_id, entry_kind, business_date, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setTransactions((data || []) as Transaction[]); });
    return () => { active = false; };
  }, [supabase]);

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;

    const { data, error } = await supabase.rpc("record_expense", {
      p_store_id: "11111111-1111-1111-1111-111111111111",
      p_category: category,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã ghi nhận chi phí!");
      
      // Trigger Web Push Notification asynchronously
      if (data) {
        fetch("/api/notifications/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: data }),
        }).catch(console.error);
      }
      
      form.reset();
      setAmountInput("");
      fetchTransactions();
    }
  };

  const openCancelModal = (id: string) => {
    setCancelTargetId(id);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const executeCancel = async () => {
    if (!cancelTargetId) return;
    
    if (!cancelReason.trim()) {
      toast.error("Lý do huỷ không được để trống!");
      return;
    }

    const { error } = await supabase.rpc("cancel_transaction", {
      p_transaction_id: cancelTargetId,
      p_reason: cancelReason.trim(),
    });

    if (error) {
      toast.error("Lỗi khi huỷ: " + error.message);
    } else {
      toast.success("Đã huỷ giao dịch!");
      
      // We don't necessarily need to push on cancel, but if we want:
      // fetch("/api/notifications/trigger", { ... }).catch(console.error);
      
      setCancelModalOpen(false);
      setCancelTargetId(null);
      fetchTransactions();
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

  const completedTransactions = filteredTransactions.filter(t => t.status === "completed");
  const grossIncome = completedTransactions
    .filter(t => t.type === "income")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const refundAmount = completedTransactions
    .filter(t => t.entry_kind === "refund")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const operatingExpense = completedTransactions
    .filter(t => t.type === "expense" && t.entry_kind === "regular")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const netRevenue = grossIncome - refundAmount;
  const netCash = netRevenue - operatingExpense;

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-rule border border-rule mb-6">
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Doanh thu gộp</div>
            <div className="font-mono text-base md:text-lg text-green-600">+{grossIncome.toLocaleString()}đ</div>
          </div>
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Hoàn tiền</div>
            <div className="font-mono text-base md:text-lg text-destructive">-{refundAmount.toLocaleString()}đ</div>
          </div>
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Chi vận hành</div>
            <div className="font-mono text-base md:text-lg text-destructive">-{operatingExpense.toLocaleString()}đ</div>
          </div>
          <div className="bg-paper p-3">
            <div className="text-sm text-mid mb-1">Thực thu</div>
            <div className="font-mono text-base md:text-lg font-medium">{netCash.toLocaleString()}đ</div>
            <div className="text-[10px] text-mid mt-1">Doanh thu thuần: {netRevenue.toLocaleString()}đ</div>
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
                    {t.entry_kind === "refund" && <span className="bg-amber-100 text-amber-800 px-1 rounded text-[10px] font-bold">HOÀN TIỀN</span>}
                    {isCancelled && <span className="bg-destructive/10 text-destructive px-1 rounded text-[10px] font-bold">ĐÃ HUỶ</span>}
                  </div>
                  <div className="text-xs text-mid">{new Date(t.created_at).toLocaleString()}</div>
                  {isCancelled && t.cancel_reason && (
                    <div className="text-xs text-destructive mt-1">Lý do: {t.cancel_reason}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`font-mono ${isCancelled ? 'line-through text-mid' : (t.type === 'income' ? 'text-green-600' : 'text-destructive')}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}đ
                  </div>
                  {!isCancelled && !t.order_id && (
                    <button 
                      onClick={() => openCancelModal(t.id)}
                      className="text-xs text-mid hover:text-destructive underline"
                    >
                      Huỷ
                    </button>
                  )}
                  {t.order_id && (
                    <Link href="/admin/orders" className="text-[10px] text-mid underline">
                      Quản lý tại Đơn hàng
                    </Link>
                  )}
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
      
      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-paper border border-rule w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-medium mb-4">Huỷ giao dịch</h3>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-mid">Lý do huỷ</label>
              <input
                autoFocus
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do..."
                className="w-full p-2 border border-rule bg-surface"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 border border-rule hover:bg-surface text-sm font-medium transition-colors"
              >
                Đóng
              </button>
              <button 
                onClick={executeCancel}
                className="px-4 py-2 bg-destructive text-white hover:opacity-90 text-sm font-medium transition-opacity"
              >
                Xác nhận Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
