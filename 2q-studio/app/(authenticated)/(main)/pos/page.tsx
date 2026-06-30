"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/useCartStore";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

// Self-hosted inline SVG — no external dependency, works in prod & dev.
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function StaffPosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const cart = useCartStore();

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, product_images(public_url, is_primary, sort_order)")
      .eq("status", "in_stock")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-mid animate-pulse">Khởi tạo POS...</div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;

    const idempotencyKey = crypto.randomUUID();
    const orderItems = [...cart.items]; // Snapshot for printing
    const orderTotal = cart.getTotal();

    const { data, error } = await supabase.rpc("checkout_order", {
      p_store_id: "11111111-1111-1111-1111-111111111111", 
      p_items: orderItems.map((i) => ({ product_id: i.product_id, sale_price: i.sale_price, quantity: 1 })),
      p_discount: 0,
      p_payment_method: "cash",
      p_customer_name: "Khách lẻ",
      p_customer_phone: null,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      toast.error("Checkout thất bại: " + error.message);
    } else {
      toast.success("Thanh toán thành công!");
      // Save snapshot for print
      setLastOrder({
        id: data,
        items: orderItems,
        total: orderTotal,
        date: new Date().toLocaleString()
      });
      
      cart.clearCart();
      fetchProducts();
      
      // Give React time to render the print section, then print
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  return (
    <>
      {/* PRINT ONLY SECTION - 80mm Receipt Fallback */}
      <div className="hidden print:block w-[80mm] text-black font-mono text-xs">
        <div className="text-center font-bold mb-2">2Q STUDIO</div>
        <div className="text-center mb-4">Hóa đơn bán lẻ</div>
        {lastOrder && (
          <>
            <div className="mb-2 border-b border-black pb-2">
              Ngày: {lastOrder.date}<br/>
            </div>
            <table className="w-full mb-2">
              <tbody>
                {lastOrder.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1">{item.name}<br/><span className="text-[10px]">{item.sku}</span></td>
                    <td className="py-1 text-right align-top">{item.sale_price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-black pt-2 flex justify-between font-bold text-sm">
              <span>TỔNG</span>
              <span>{lastOrder.total.toLocaleString()}</span>
            </div>
            <div className="text-center mt-4 text-[10px]">Cảm ơn quý khách!</div>
          </>
        )}
      </div>

      {/* SCREEN UI */}
      <div className="p-4 flex flex-col h-full lg:flex-row gap-4 print:hidden">
        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
            <h2 className="font-sans text-xl font-medium">Sản phẩm có sẵn</h2>
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-rule p-2 rounded-sm w-full md:w-64 bg-paper"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[1px] bg-rule border border-rule">
            {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => {
              const inCart = cart.items.some((i) => i.product_id === p.id);
              const images = p.product_images || [];
              const primaryImage = images.find((img: any) => img.is_primary) || images[0];
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
                    <img
                      src={imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
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
        </div>

        {/* Cart Panel */}
        <div className="w-full lg:w-96 bg-surface border border-rule p-4 flex flex-col">
          <h2 className="font-sans text-xl font-medium mb-4">Giỏ hàng</h2>
          <div className="flex-1 overflow-auto flex flex-col gap-2">
            {cart.items.map((item) => (
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
                <button onClick={() => cart.removeItem(item.product_id)} className="text-destructive p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {cart.items.length === 0 && (
              <div className="text-mid text-center py-8 text-sm">Giỏ hàng trống</div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-rule">
            <div className="flex justify-between font-mono text-lg mb-4">
              <span>Tổng:</span>
              <span>{cart.getTotal().toLocaleString()}đ</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.items.length === 0}
              className="w-full bg-ink text-paper py-3 font-medium  uppercase tracking-wider disabled:opacity-50"
            >
              Thanh toán & In Bill
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
