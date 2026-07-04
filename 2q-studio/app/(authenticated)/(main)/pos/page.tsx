"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/lib/store/use-app-data";
import { executeCheckoutOrder } from "@/lib/store/supabase-store";

// Self-hosted inline SVG — no external dependency, works in prod & dev.
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function StaffPosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNotes, setOrderNotes] = useState("");
  const [displayLimit, setDisplayLimit] = useState(6);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data, loadingProducts, cartTotal, cart, setLastOrder, refreshProducts } = useAppData();
  const router = useRouter();

  if (loadingProducts) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-mid animate-pulse">Khởi tạo POS...</div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (data.cart.length === 0) return;
    
    setIsCheckingOut(true);
    // Execute side-effect through the Supabase Storage Adapter
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

      // Save snapshot for print
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
      refreshProducts(); // Because inventory changed
    }
  };

  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === "all" || p.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const displayedProducts = filteredProducts.slice(0, displayLimit);

  return (
    <div className="p-4 flex flex-col h-full lg:flex-row gap-4 print:hidden">
      {/* Product Grid */}
      <div className="flex-1">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <h2 className="font-sans text-xl font-medium">Sản phẩm có sẵn</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="border border-rule p-2 rounded-sm bg-paper text-sm"
            >
              <option value="all">Tất cả hạng</option>
              <option value="standard">Thường (#)</option>
              <option value="premium">Xịn ($)</option>
              <option value="done">Hoàn thành (&)</option>
            </select>
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-rule p-2 rounded-sm w-full md:w-64 bg-paper"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[1px] bg-rule border border-rule">
          {displayedProducts.map((p) => {
            const inCart = data.cart.some((i) => i.product_id === p.id);
            const images = p.product_images || [];
            const primaryImage = images.find((img) => img.is_primary) || images[0];
            const imageUrl = (primaryImage && primaryImage.public_url) ? primaryImage.public_url : FALLBACK_IMAGE;

            return (
              <button
                key={p.id}
                disabled={inCart}
                onClick={() =>
                  cart.addItem({
                    product_id: p.id,
                    sku: p.sku,
                    name: p.name,
                    base_price: p.base_price,
                    sale_price: p.base_price,
                    quantity: 1,
                  })
                }
                className={`bg-paper flex flex-col text-left transition-opacity aspect-[3/4] ${
                  inCart ? "opacity-40" : "hover:bg-surface"
                }`}
              >
                {/* Image Section */}
                <div className="aspect-square w-full bg-surface border-b border-rule relative overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).srcset = "";
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                </div>

                {/* Info Section */}
                <div className="p-2 flex flex-col justify-between flex-1">
                  <div>
                    <div className="font-display text-sm tracking-wider truncate">{p.sku}</div>
                    <div className="text-[10px] text-mid line-clamp-1 mt-0.5">{p.name}</div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="font-mono text-xs font-semibold">{p.base_price.toLocaleString()}đ</span>
                    {inCart && <span className="text-[10px] text-mid uppercase font-medium">Đã chọn</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Show More Button */}
        {displayLimit < filteredProducts.length && (
          <div className="mt-8 mb-8 text-center">
            <button
              onClick={() => setDisplayLimit(prev => prev + 6)}
              className="px-6 py-2 border border-rule hover:bg-surface transition-colors font-medium text-sm rounded-sm"
            >
              Xem thêm ({filteredProducts.length - displayLimit})
            </button>
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 bg-surface border border-rule p-4 flex flex-col">
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
    </div>
  );
}
