"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const supabase = createClient();

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, sku))")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    
    setOrders(data || []);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BackButton />
        <h2 className="font-sans text-xl font-medium">Đơn hàng của bạn</h2>
      </div>
      
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-paper border border-rule p-4">
            <div className="flex justify-between items-center border-b border-rule pb-2 mb-2">
              <div className="font-display text-lg">{o.order_number}</div>
              <div className="text-sm font-medium uppercase px-2 py-1 bg-surface">
                {o.status}
              </div>
            </div>
            <div className="text-sm text-mid mb-2">
              Ngày: {new Date(o.created_at).toLocaleString()}
            </div>
            <div className="space-y-1 mb-2">
              {o.order_items?.map((i: any) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.products?.name} ({i.products?.sku})</span>
                  <span className="font-mono">{i.sale_price.toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-medium pt-2 border-t border-rule font-mono">
              <span>Tổng cộng</span>
              <span>{o.total.toLocaleString()}đ</span>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="text-mid">Chưa có đơn hàng nào.</div>}
      </div>
    </div>
  );
}
