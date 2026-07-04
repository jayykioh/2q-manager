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
      toast.success("Thanh toán thành công!");
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
}
