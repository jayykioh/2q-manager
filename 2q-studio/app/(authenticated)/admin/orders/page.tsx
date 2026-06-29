"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const supabase = createClient();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, sku))")
      .order("created_at", { ascending: false });
    
    setOrders(data || []);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    const reason = prompt("Lý do hủy đơn hàng?");
    if (!reason) return;

    const { error } = await supabase.rpc("cancel_order", {
      p_order_id: orderId,
      p_reason: reason
    });

    if (error) {
      toast.error("Lỗi khi hủy: " + error.message);
    } else {
      toast.success("Đã hủy đơn hàng thành công!");
      fetchOrders();
    }
  };

  return (
    <div className="p-4">
      <h2 className="font-sans text-xl font-medium mb-4">Quản lý Tất cả Đơn hàng</h2>
      
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-paper border border-rule p-4">
            <div className="flex justify-between items-center border-b border-rule pb-2 mb-2">
              <div className="font-display text-lg">{o.order_number}</div>
              <div className="flex gap-4 items-center">
                <div className={`text-sm font-medium uppercase px-2 py-1 ${o.status === 'cancelled' ? 'bg-destructive text-paper' : 'bg-surface'}`}>
                  {o.status}
                </div>
                {o.status !== 'cancelled' && (
                  <button 
                    onClick={() => handleCancel(o.id)}
                    className="text-xs border border-destructive text-destructive px-2 py-1 "
                  >
                    Hủy Đơn
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm text-mid mb-2">
              Ngày: {new Date(o.created_at).toLocaleString()} | Thu ngân: {o.created_by}
            </div>
            {o.status === 'cancelled' && (
              <div className="text-sm text-destructive mb-2 bg-destructive/10 p-2">
                Lý do hủy: {o.cancel_reason}
              </div>
            )}
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
      </div>
    </div>
  );
}
