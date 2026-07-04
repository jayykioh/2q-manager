import { createClient } from "@/lib/supabase/client";
import { AppData, Product } from "./types";
import { dispatchDataChanged } from "./local-store";
import { getCartTotal } from "./cart-mutations";
import { toast } from "sonner";

// Pure fetching, returns data but also dispatches if needed.
export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(public_url, is_primary, sort_order)")
    .eq("status", "in_stock")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  return (data || []) as Product[];
};

export const executeCheckoutOrder = async (
  data: AppData,
  paymentMethod: string,
  orderNotes: string
): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  const supabase = createClient();
  const orderItems = data.cart;
  if (orderItems.length === 0) return { success: false, error: "Giỏ hàng trống" };

  const idempotencyKey = crypto.randomUUID();

  const { data: orderId, error } = await supabase.rpc("checkout_order", {
    p_store_id: "11111111-1111-1111-1111-111111111111",
    p_items: orderItems.map((i) => ({
      product_id: i.product_id,
      sale_price: i.sale_price,
      quantity: 1,
    })),
    p_discount: 0,
    p_payment_method: paymentMethod,
    p_customer_name: "Khách lẻ",
    p_customer_phone: null,
    p_idempotency_key: idempotencyKey,
    p_notes: orderNotes ? orderNotes : null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Trigger web push asynchronously
  fetch("/api/notifications/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderId }),
  }).catch(console.error);

  // Notify other tabs that checkout succeeded (so they might refresh their products)
  dispatchDataChanged();

  return { success: true, orderId: orderId as string };
};
