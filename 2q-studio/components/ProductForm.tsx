"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ProductFormProps {
  onSuccess?: () => void;
  defaultStoreId: string;
}

export function ProductForm({ onSuccess, defaultStoreId }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
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

        uploadedImages.push({
          r2_key: key,
          public_url: null, // Private bucket MVP
          blur_data: null, // Skip MVP
          width: 1200,
          height: 1200,
          angle: index === 0 ? "front" : "detail",
          is_primary: index === 0,
          sort_order: index,
        });
      }

      // 2. Generate SKU
      const epoch = Date.now().toString().slice(-6);
      let prefix = "OT";
      if (type === "bracelet") prefix = "BR";
      if (type === "ring") prefix = "RG";
      const sku = `2Q-${prefix}-${epoch}`;

      // 3. Call RPC
      const { error } = await supabase.rpc("create_product", {
        p_sku: sku,
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
      
      <div>
        <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
        <input required name="name" className="w-full border border-rule p-2 " />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" className="w-full border border-rule p-2  bg-paper">
            <option value="bracelet">Vòng tay</option>
            <option value="ring">Nhẫn</option>
            <option value="earring">Hoa tai</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hạng</label>
          <select name="tier" className="w-full border border-rule p-2  bg-paper">
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Giá cơ bản (VNĐ)</label>
        <input required name="basePrice" type="number" defaultValue={500000} className="w-full border border-rule p-2  font-mono" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Ảnh sản phẩm</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 border border-rule bg-surface">
              <img src={URL.createObjectURL(img)} alt="" className="object-cover w-full h-full" />
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
