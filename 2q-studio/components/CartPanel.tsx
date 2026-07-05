"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store/use-app-data";
import { executeCheckoutOrder } from "@/lib/store/supabase-store";

export function CartPanel() {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const router = useRouter();
  const { data, cartTotal, cart, setLastOrder, refreshProducts } = useAppData();

  const handleCheckout = async () => {
    if (data.cart.length === 0) return;
    
    setIsCheckingOut(true);
    const result = await executeCheckoutOrder(data, paymentMethod, orderNotes);
    setIsCheckingOut(false);

    if (!result.success) {
      if (result.error?.includes("PRODUCT_UNAVAILABLE")) {
        toast.error("Một số sản phẩm trong giỏ không còn khả dụng (đã bán hoặc bị ẩn). Vui lòng xóa chúng khỏi giỏ hàng.");
        refreshProducts();
      } else {
        toast.error("Checkout thất bại: " + result.error);
      }
    } else {
      setLastOrder({
        id: result.orderId!,
        items: [...data.cart],
        total: cartTotal,
        date: new Date().toLocaleString(),
        paymentMethod: paymentMethod,
        notes: orderNotes,
      });
      
      cart.clearCart();
      setOrderNotes("");
      refreshProducts();
    }
  };

  return (
    <div className="w-full lg:w-96 bg-surface border border-rule p-4 flex flex-col h-full">
      <h2 className="font-sans text-xl font-medium mb-4">Giỏ hàng</h2>
      <div className="flex-1 overflow-auto flex flex-col gap-2">
        {data.cart.map((item) => (
          <div key={item.product_id} className="bg-paper p-3 border border-rule flex justify-between items-center">
            <div>
              <div className="font-display">{item.sku}</div>
              <input
                type="number"
                value={item.sale_price}
                onChange={(e) => cart.updateSalePrice(item.product_id, Number(e.target.value))}
                className="font-mono text-sm border border-rule px-1 mt-1 w-24 bg-paper"
              />
            </div>
            <button onClick={() => cart.removeItem(item.product_id)} className="text-destructive p-2 hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {data.cart.length === 0 && (
          <div className="text-mid text-center py-8 text-sm">Giỏ hàng trống</div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-rule">
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Phương thức thanh toán</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`py-2 text-sm border ${paymentMethod === "cash" ? "bg-ink text-paper border-ink" : "bg-paper text-ink hover:bg-surface border-rule"} rounded-sm transition-colors`}
            >
              Tiền mặt
            </button>
            <button
              onClick={() => setPaymentMethod("transfer")}
              className={`py-2 text-sm border ${paymentMethod === "transfer" ? "bg-ink text-paper border-ink" : "bg-paper text-ink hover:bg-surface border-rule"} rounded-sm transition-colors`}
            >
              CK
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`py-2 text-sm border ${paymentMethod === "card" ? "bg-ink text-paper border-ink" : "bg-paper text-ink hover:bg-surface border-rule"} rounded-sm transition-colors`}
            >
              Quẹt thẻ
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Ghi chú đơn hàng</div>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Khách cần ghi chú thêm..."
            className="w-full border border-rule bg-paper p-2 text-sm min-h-[60px] resize-none"
          />
        </div>

        <div className="flex justify-between font-mono text-lg mb-4">
          <span>Tổng:</span>
          <span>{cartTotal.toLocaleString()}đ</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={data.cart.length === 0 || isCheckingOut}
          className="w-full bg-ink text-paper py-3 font-medium uppercase tracking-wider disabled:opacity-50"
        >
          {isCheckingOut ? "Đang xử lý..." : "Thanh toán"}
        </button>
        {data.lastOrder && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-center text-success font-medium text-sm">
              Thanh toán thành công!
            </div>
            <button
              onClick={() => router.push(`/pos/bill/${data.lastOrder!.id}`)}
              className="w-full bg-paper text-ink border border-ink py-3 font-medium uppercase tracking-wider hover:bg-surface transition-colors"
            >
              Xem Bill (Đơn {data.lastOrder.id.slice(0, 8)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
