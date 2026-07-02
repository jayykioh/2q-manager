"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { BackButton } from "@/components/BackButton";

const ProductForm = dynamic(() => import("@/components/ProductForm").then((mod) => mod.ProductForm), {
  loading: () => <div className="p-8 border border-rule bg-surface animate-pulse h-[400px]"></div>,
  ssr: false,
});
import { Check, X, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Self-hosted inline SVG — no external dependency, works in prod & dev.
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteModalProductId, setDeleteModalProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, product_images(public_url, is_primary, sort_order)")
      .neq("status", "archived")
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
      setProducts(prev => prev.map(p => p.id === id ? { ...p, approval_status: status } : p));
    }
  };

  const handleDeleteProduct = (id: string) => {
    setDeleteModalProductId(id);
  };

  const executeDelete = async () => {
    if (!deleteModalProductId) return;
    
    // Soft delete (Best practice to prevent foreign key issues with orders)
    const { error } = await supabase.from("products").update({ status: 'archived' }).eq("id", deleteModalProductId);
    if (error) {
      toast.error("Lỗi xóa sản phẩm: " + error.message);
    } else {
      toast.success("Sản phẩm đã được xóa!");
      setProducts(prev => prev.filter(p => p.id !== deleteModalProductId));
    }
    setDeleteModalProductId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const tier = formData.get("tier") as string;
    const base_price = Number(formData.get("basePrice"));
    const newImage = formData.get("newImage") as File | null;

    try {
      // 1. Upload new image if provided
      if (newImage && newImage.size > 0) {
        // Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: newImage.name, contentType: newImage.type, folder: "products" }),
        });
        
        if (!presignRes.ok) throw new Error("Lỗi khi lấy link upload");
        
        const { url, key } = await presignRes.json();
        
        // Upload to R2
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: newImage,
          headers: { "Content-Type": newImage.type },
        });

        if (!uploadRes.ok) throw new Error("Lỗi khi tải ảnh lên R2");

        const r2PublicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
        const publicUrl = r2PublicDomain ? `${r2PublicDomain}/${key}` : null;

        // Delete old image record
        await supabase.from("product_images").delete().eq("product_id", editingProduct.id);

        // Insert new image record
        await supabase.from("product_images").insert({
          product_id: editingProduct.id,
          r2_key: key,
          public_url: publicUrl,
          is_primary: true,
          sort_order: 0,
        });
      }

      // 2. Update product info
      const { error } = await supabase.from("products").update({
        name, type, tier, base_price
      }).eq("id", editingProduct.id);

      if (error) throw error;

      toast.success("Đã cập nhật sản phẩm!");
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name, type, tier, base_price } : p));
      setEditingProduct(null);
      // Fetch in background to update images if needed
      fetchProducts();
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => filterTier === "all" || p.tier === filterTier);

  return (
    <div className="p-4 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto items-start pb-20">
      
      {/* Product List Section */}
      <div className="flex-1 w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BackButton />
            <h2 className="font-sans text-2xl font-bold uppercase tracking-wide">Kho hàng</h2>
          </div>
          <div className="flex gap-2 flex-wrap text-sm font-medium">
             <button onClick={() => setFilterTier("all")} className={`px-3 py-1 border transition-colors ${filterTier === "all" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-rule hover:bg-surface"}`}>Tất cả</button>
             <button onClick={() => setFilterTier("standard")} className={`px-3 py-1 border transition-colors ${filterTier === "standard" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-rule hover:bg-surface"}`}>Thường</button>
             <button onClick={() => setFilterTier("premium")} className={`px-3 py-1 border transition-colors ${filterTier === "premium" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-rule hover:bg-surface"}`}>Xịn</button>
             <button onClick={() => setFilterTier("done")} className={`px-3 py-1 border transition-colors ${filterTier === "done" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-rule hover:bg-surface"}`}>Hoàn thành</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            // Get the primary image, or the first image, or fallback
            const images = p.product_images || [];
            const primaryImage = images.find((img: any) => img.is_primary) || images[0];
            const imageUrl = (primaryImage && primaryImage.public_url) ? primaryImage.public_url : FALLBACK_IMAGE;

            return (
              <div key={p.id} className="bg-paper border border-rule flex flex-col group relative">
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
                  
                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.approval_status === "pending" && (
                      <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">Pending</span>
                    )}
                    {p.status !== "in_stock" && (
                      <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">{p.status}</span>
                    )}
                  </div>
                  
                  {/* Action Buttons overlay on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingProduct(p)}
                      className="p-1.5 bg-paper/90 backdrop-blur-sm border border-rule rounded-sm hover:bg-surface text-ink"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 bg-paper/90 backdrop-blur-sm border border-rule rounded-sm hover:bg-destructive hover:text-white text-destructive transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                <label className="block text-sm font-medium mb-1">Ảnh sản phẩm mới (Bỏ trống nếu không đổi)</label>
                <input type="file" name="newImage" accept="image/*" className="w-full border border-rule p-2 text-sm bg-paper" />
              </div>

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
                  <label className="block text-sm font-medium mb-1">Hạng</label>
                  <select name="tier" defaultValue={editingProduct.tier} className="w-full border border-rule p-2 bg-paper">
                    <option value="standard">Thường (#)</option>
                    <option value="premium">Xịn ($)</option>
                    <option value="done">Hoàn thành (&)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Giá bán cơ bản (VNĐ)</label>
                <input required type="number" name="basePrice" defaultValue={editingProduct.base_price} className="w-full border border-rule p-2" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 border border-rule hover:bg-surface" disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="flex-1 py-3 bg-ink text-paper font-medium disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalProductId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-paper p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-display text-lg font-medium mb-2">Xóa sản phẩm</h3>
            <p className="text-mid mb-6 text-sm">
              Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi hệ thống và không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalProductId(null)}
                className="flex-1 py-2 border border-rule hover:bg-surface font-medium"
              >
                Hủy
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-2 bg-destructive text-white font-medium"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
