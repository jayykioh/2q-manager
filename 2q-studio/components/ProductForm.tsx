"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Guard: alert developers early if the R2 public URL env var is missing.
// In production this env var MUST be set in Vercel → Project → Environment Variables.
if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
  console.error(
    "[2Q] NEXT_PUBLIC_R2_PUBLIC_URL is not set. " +
    "Images uploaded in this session will have a null public_url in the database. " +
    "Add it to Vercel Environment Variables and redeploy."
  );
}

interface ProductFormProps {
  onSuccess?: () => void;
  defaultStoreId: string;
}

export function ProductForm({ onSuccess, defaultStoreId }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [price, setPrice] = useState<string>("500000");
  const supabase = createClient();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedFiles = await Promise.all(
        files.map((file) =>
          imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: "image/webp",
          })
        )
      );
      setImages((prev) => [...prev, ...compressedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const type = formData.get("type") as string;
      const tier = formData.get("tier") as string;
      const basePrice = Number(formData.get("basePrice"));

      // 1. Upload Images to R2
      const uploadedImages = [];
      for (const [index, file] of images.entries()) {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder: "products",
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get presigned URL");
        
        const { url, key } = await presignRes.json();
        
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image");

        const r2PublicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
        
        uploadedImages.push({
          r2_key: key,
          public_url: r2PublicDomain ? `${r2PublicDomain}/${key}` : null,
          blur_data: null, // Skip MVP
          width: 1200,
          height: 1200,
          angle: index === 0 ? "front" : "detail",
          is_primary: index === 0,
          sort_order: index,
        });
      }

      // 2. Generate SKU if not provided
      let finalSku = formData.get("sku") as string;
      if (!finalSku) {
        const epoch = Date.now().toString().slice(-6);
        let prefix = "OT";
        if (type === "bracelet") prefix = "BR";
        if (type === "ring") prefix = "RG";
        if (type === "earring") prefix = "ER";
        
        let suffix = "";
        if (tier === "standard") suffix = "#";
        if (tier === "premium") suffix = "$";
        if (tier === "done") suffix = "&";
        
        finalSku = `2Q-${prefix}-${epoch}${suffix}`;
      }

      // 3. Call RPC
      const { error } = await supabase.rpc("create_product", {
        p_sku: finalSku,
        p_name: name,
        p_type: type,
        p_tier: tier,
        p_store_id: defaultStoreId,
        p_base_price: basePrice,
        p_length_mm: null,
        p_weight_g: null,
        p_images: uploadedImages,
      });

      if (error) throw error;

      toast.success("Sản phẩm đã được tạo!");
      setImages([]);
      form.reset();
      onSuccess?.();
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-paper p-4 border border-rule w-full">
      <h2 className="font-sans font-bold text-xl uppercase tracking-wide mb-4">Thêm sản phẩm mới</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mã SP (SKU)</label>
          <input name="sku" placeholder="Tự động tạo nếu trống" className="w-full border border-rule p-2 font-mono text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
          <input required name="name" className="w-full border border-rule p-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" className="w-full border border-rule p-2 bg-paper">
            <option value="bracelet">Vòng tay</option>
            <option value="ring">Nhẫn</option>
            <option value="earring">Hoa tai</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hạng</label>
          <select name="tier" className="w-full border border-rule p-2 bg-paper">
            <option value="standard">Thường (#)</option>
            <option value="premium">Xịn ($)</option>
            <option value="done">Hoàn thành (&)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Giá cơ bản (VNĐ)</label>
        <div className="space-y-2">
          <input 
            required 
            name="basePrice" 
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-rule p-2 font-mono" 
          />
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setPrice(p => p ? (Number(p) * 1000).toString() : "1000")} 
              className="text-xs bg-surface border border-rule px-2 py-1 hover:bg-rule transition-colors"
            >
              +000 (x1.000)
            </button>
            <button 
              type="button" 
              onClick={() => setPrice(p => p ? (Number(p) * 1000000).toString() : "1000000")} 
              className="text-xs bg-surface border border-rule px-2 py-1 hover:bg-rule transition-colors"
            >
              +000.000 (x1.000.000)
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Ảnh sản phẩm</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 border border-rule bg-surface">
              <img
                src={URL.createObjectURL(img)}
                alt=""
                loading="lazy"
                className="object-cover w-full h-full"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-destructive text-paper  p-1">
                <X size={12} />
              </button>
            </div>
          ))}
          <label className="w-20 h-20 border border-dashed border-mid flex items-center justify-center cursor-pointer hover:bg-surface">
            <Upload size={20} className="text-mid" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <button disabled={loading} type="submit" className="w-full bg-ink text-paper py-3 font-medium  flex items-center justify-center disabled:opacity-50">
        {loading ? <Loader2 className="animate-spin" /> : "Lưu Sản Phẩm"}
      </button>
    </form>
  );
}
