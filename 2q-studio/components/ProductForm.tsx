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
  stores?: {id: string, name: string}[];
}

export function ProductForm({ onSuccess, defaultStoreId, stores }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [price, setPrice] = useState<string>("500000");
  const supabase = createClient();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of files) {
        try {
          // Nén full size để preview modal (1200px WebP)
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: "image/webp",
          });
          validFiles.push(compressed);
        } catch (err: unknown) {
          console.error("Lỗi nén ảnh:", err);
          toast.error(`Không thể nén ảnh ${file.name}, đang dùng ảnh gốc. Lỗi: ${err instanceof Error ? err.message : ""}`);
          validFiles.push(file);
        }
      }

      setImages((prev) => [...prev, ...validFiles]);
      
      // Reset input để có thể chọn lại cùng 1 file (lỗi kinh điển trên mobile)
      e.target.value = "";
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
      const note = formData.get("note") as string;
      const storeId = formData.get("store_id") as string || defaultStoreId;

      // 1. Upload Images to R2 (two variants: thumb 400px + full 1200px)
      const uploadedImages = [];
      const r2PublicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

      for (const [index, file] of images.entries()) {
        // --- Generate thumb variant (400px, for product grids) ---
        let thumbFile: File = file;
        try {
          thumbFile = await imageCompression(file, {
            maxSizeMB: 0.15,
            maxWidthOrHeight: 400,
            useWebWorker: true,
            fileType: "image/webp",
          });
        } catch {
          thumbFile = file;
        }

        // --- Upload full variant ---
        const presignFull = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: `full_${index}.webp`, contentType: "image/webp", folder: "products" }),
        });
        if (!presignFull.ok) throw new Error("Failed to get presigned URL (full)");
        const { url: fullUrl, key: fullKey } = await presignFull.json();
        const uploadFull = await fetch(fullUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!uploadFull.ok) throw new Error("Failed to upload full image");

        // --- Upload thumb variant ---
        const presignThumb = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: `thumb_${index}.webp`, contentType: "image/webp", folder: "products" }),
        });
        if (!presignThumb.ok) throw new Error("Failed to get presigned URL (thumb)");
        const { url: thumbUrl, key: thumbKey } = await presignThumb.json();
        const uploadThumb = await fetch(thumbUrl, { method: "PUT", body: thumbFile, headers: { "Content-Type": "image/webp" } });
        if (!uploadThumb.ok) throw new Error("Failed to upload thumb image");

        uploadedImages.push({
          r2_key: fullKey,
          public_url: r2PublicDomain ? `${r2PublicDomain}/${fullKey}` : null,
          thumb_r2_key: thumbKey,
          thumb_url: r2PublicDomain ? `${r2PublicDomain}/${thumbKey}` : null,
          blur_data: null,
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
        if (type === "keychain") prefix = "KC";
        if (type === "necklace") prefix = "NK";
        if (type === "spoon") prefix = "SP";
        if (type === "fork") prefix = "FK";
        
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
        p_store_id: storeId,
        p_base_price: basePrice,
        p_length_mm: null,
        p_weight_g: null,
        p_images: uploadedImages,
        p_note: note || null,
      });

      if (error) throw error;

      toast.success("Sản phẩm đã được tạo!");
      setImages([]);
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Không xác định"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
        <input
          required
          name="name"
          type="text"
          placeholder="Nhập tên sản phẩm"
          className="w-full border border-rule p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">SKU (để trống để tự tạo)</label>
        <input
          name="sku"
          type="text"
          placeholder="VD: 2Q-BR-123456#"
          className="w-full border border-rule p-2 font-mono"
        />
      </div>

      {stores && stores.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1">Cửa hàng</label>
          <select name="store_id" className="w-full border border-rule p-2 bg-paper">
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" className="w-full border border-rule p-2 bg-paper">
            <option value="bracelet">Vòng tay</option>
            <option value="ring">Nhẫn</option>
            <option value="earring">Hoa tai</option>
            <option value="keychain">Móc khóa</option>
            <option value="necklace">Dây chuyền</option>
            <option value="spoon">Muỗng</option>
            <option value="fork">Nĩa</option>
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
        <label className="block text-sm font-medium mb-1">Ghi chú</label>
        <textarea name="note" rows={2} placeholder="Nhập ghi chú cho sản phẩm (nếu có)" className="w-full border border-rule p-2 resize-none" />
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
              <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-destructive text-paper p-1">
                <X size={12} />
              </button>
            </div>
          ))}
          <label className="w-20 h-20 border border-dashed border-mid flex items-center justify-center cursor-pointer hover:bg-surface">
            <Upload size={20} className="text-mid" />
            <input type="file" accept="image/jpeg, image/png, image/webp, image/avif" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <button disabled={loading} type="submit" className="w-full bg-ink text-paper py-3 font-medium flex items-center justify-center disabled:opacity-50">
        {loading ? <Loader2 className="animate-spin" /> : "Lưu Sản Phẩm"}
      </button>
    </form>
  );
}
