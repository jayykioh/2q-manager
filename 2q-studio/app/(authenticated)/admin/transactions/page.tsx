"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const supabase = createClient();

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    
    setTransactions(data || []);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("transactions").insert({
      store_id: "11111111-1111-1111-1111-111111111111", // Default store MVP
      type: "expense",
      category,
      amount,
      description,
      recorded_by: user?.id
    });

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã ghi nhận chi phí!");
      form.reset();
      fetchTransactions();
    }
  };

  return (
    <div className="p-4 flex gap-8">
      <div className="flex-1">
        <h2 className="font-sans text-xl font-medium mb-4">Lịch sử Thu Chi</h2>
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="bg-paper border border-rule p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{t.description || "Giao dịch"}</div>
                <div className="text-sm text-mid uppercase">{t.category}</div>
                <div className="text-xs text-mid">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-mono ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}đ
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-96">
        <form onSubmit={handleAddExpense} className="bg-surface border border-rule p-4 space-y-4">
          <h3 className="font-medium text-lg">Ghi nhận Chi phí</h3>
          <div>
            <label className="block text-sm mb-1">Loại chi</label>
            <select name="category" className="w-full p-2 border border-rule bg-paper">
              <option value="import">Nhập hàng</option>
              <option value="salary">Lương</option>
              <option value="other_expense">Chi phí khác</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Số tiền (VNĐ)</label>
            <input name="amount" type="number" required min="0" className="w-full p-2 border border-rule font-mono" />
          </div>
          <div>
            <label className="block text-sm mb-1">Mô tả</label>
            <input name="description" required className="w-full p-2 border border-rule" />
          </div>
          <button type="submit" className="w-full bg-ink text-paper py-2 uppercase font-medium tracking-wider">
            Lưu khoản chi
          </button>
        </form>
      </div>
    </div>
  );
}
