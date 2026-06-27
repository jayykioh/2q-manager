"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductForm } from "@/components/ProductForm";
import { Check, X } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const supabase = createClient();

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleApprove = async (id: string, status: string) => {
    // Note: In real prod, this should be an RPC or an admin-only update policy
    await supabase.from("products").update({ approval_status: status }).eq("id", id);
    fetchProducts();
  };

  return (
    <div className="p-4 flex gap-8">
      <div className="flex-1">
        <h2 className="font-sans text-xl font-medium mb-4">Danh sách Sản phẩm</h2>
        <div className="grid gap-2">
          {products.map((p) => (
            <div key={p.id} className="bg-paper border border-rule p-3 flex justify-between items-center">
              <div>
                <div className="font-display text-lg">{p.sku}</div>
                <div className="text-sm text-mid">{p.name} - {p.status} - {p.approval_status}</div>
                <div className="font-mono text-sm mt-1">{p.base_price.toLocaleString()}đ</div>
              </div>
              {p.approval_status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(p.id, "approved")} className="p-2 bg-success text-paper ">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleApprove(p.id, "rejected")} className="p-2 bg-destructive text-paper ">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <ProductForm onSuccess={fetchProducts} defaultStoreId="11111111-1111-1111-1111-111111111111" />
      </div>
    </div>
  );
}
