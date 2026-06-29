"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductForm } from "@/components/ProductForm";
import { Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const supabase = createClient();

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, product_images(public_url, is_primary, sort_order)")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleApprove = async (id: string, status: string) => {
    const { error } = await supabase.from("products").update({ approval_status: status }).eq("id", id);
    if (error) {
      toast.error("Lỗi duyệt sản phẩm: " + error.message);
    } else {
      toast.success(status === "approved" ? "Đã duyệt sản phẩm" : "Đã từ chối sản phẩm");
      fetchProducts();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const tier = formData.get("tier") as string;
    const base_price = Number(formData.get("basePrice"));

    const { error } = await supabase.from("products").update({
      name, type, tier, base_price
    }).eq("id", editingProduct.id);

    if (error) {
      toast.error("Lỗi khi lưu: " + error.message);
    } else {
      toast.success("Đã cập nhật sản phẩm!");
      setEditingProduct(null);
      fetchProducts();
    }
  };

  return (
    <div className="p-4 flex flex-col-reverse lg:flex-row gap-8 pb-24">
      {/* Product List */}
      <div className="flex-1">
        <h2 className="font-sans text-xl font-medium mb-4">Danh sách Sản phẩm</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            // Get the primary image, or the first image, or fallback
            const images = p.product_images || [];
            const primaryImage = images.find((img: any) => img.is_primary) || images[0];
            const imageUrl = (primaryImage && primaryImage.public_url) ? primaryImage.public_url : "https://via.placeholder.com/300?text=No+Image";

            return (
              <div key={p.id} className="bg-paper border border-rule flex flex-col group relative">
                {/* Image Section */}
                <div className="aspect-square w-full bg-surface border-b border-rule relative overflow-hidden">
                  <img src={imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  
                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.approval_status === "pending" && (
                      <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">Pending</span>
                    )}
                    {p.status !== "in_stock" && (
                      <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">{p.status}</span>
                    )}
                  </div>
                  
                  {/* Edit Button overlay on hover */}
                  <button 
                    onClick={() => setEditingProduct(p)}
                    className="absolute top-2 right-2 p-1.5 bg-paper/80 backdrop-blur-sm border border-rule rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface text-ink"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
                
                {/* Info Section */}
                <div className="p-3 flex flex-col flex-1">
                  <div className="font-display text-lg leading-tight truncate" title={p.sku}>{p.sku}</div>
                  <div className="text-xs text-mid truncate" title={p.name}>{p.name}</div>
                  
                  <div className="mt-auto pt-2 flex justify-between items-end">
                    <div className="font-mono text-sm font-medium">{p.base_price.toLocaleString()}đ</div>
                  </div>
                  
                  {/* Approval Actions */}
                  {p.approval_status === "pending" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-rule">
                      <button onClick={() => handleApprove(p.id, "approved")} className="flex-1 py-1.5 flex justify-center items-center bg-success text-paper rounded-sm">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleApprove(p.id, "rejected")} className="flex-1 py-1.5 flex justify-center items-center bg-destructive text-paper rounded-sm">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {products.length === 0 && (
          <div className="text-mid p-8 border border-rule text-center bg-surface">
            Chưa có sản phẩm nào
          </div>
        )}
      </div>
      
      {/* Product Form Section */}
      <div className="w-full lg:w-[400px] shrink-0">
        <div className="sticky top-4">
          <ProductForm onSuccess={fetchProducts} defaultStoreId="11111111-1111-1111-1111-111111111111" />
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-paper p-6 border border-rule w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-sans font-bold text-lg uppercase tracking-wide">Sửa thông tin sản phẩm</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-surface rounded-sm"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã SKU (Không thể sửa)</label>
                <input disabled value={editingProduct.sku} className="w-full border border-rule p-2 bg-surface text-mid" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
                <input required name="name" defaultValue={editingProduct.name} className="w-full border border-rule p-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại</label>
                  <select name="type" defaultValue={editingProduct.type} className="w-full border border-rule p-2 bg-paper">
                    <option value="bracelet">Vòng tay</option>
                    <option value="ring">Nhẫn</option>
                    <option value="earring">Hoa tai</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tier</label>
                  <select name="tier" defaultValue={editingProduct.tier} className="w-full border border-rule p-2 bg-paper">
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="luxury">Luxury</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Giá bán cơ bản (VNĐ)</label>
                <input required type="number" name="basePrice" defaultValue={editingProduct.base_price} className="w-full border border-rule p-2" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 border border-rule hover:bg-surface">
                  Hủy
                </button>
                <button type="submit" className="flex-1 py-3 bg-ink text-paper font-medium">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
