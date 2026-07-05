"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/store/types";
import { useAppData } from "@/lib/store/use-app-data";
import { CartPanel } from "@/components/CartPanel";

// Self-hosted inline SVG — no external dependency, works in prod & dev.
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function StaffPosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  
  // Pagination states
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [supabase] = useState(createClient);

  const { data, cart } = useAppData();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchProducts = async (pageIndex: number, currentFilter: string, search: string) => {
    if (pageIndex === 0) setIsLoadingProducts(true);
    else setIsLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    let query = supabase
      .from("products")
      .select("*, product_images(public_url, is_primary, sort_order)", { count: "exact" })
      .eq("status", "in_stock")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false });

    if (currentFilter !== "all") {
      query = query.eq("tier", currentFilter);
    }
    
    if (search.trim() !== "") {
      // Basic ilike search on name or sku
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    
    const { data: fetchResult, count } = await query.range(from, to);
    
    if (fetchResult) {
      if (pageIndex === 0) {
        setProducts(fetchResult as Product[]);
      } else {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = (fetchResult as Product[]).filter((p) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
      setHasMore(count !== null && from + PAGE_SIZE < count);
    }
    if (pageIndex === 0) setIsLoadingProducts(false);
    else setIsLoadingMore(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        setPage(0);
        await fetchProducts(0, filterTier, debouncedSearch);
      }
    };
    load();
    return () => { active = false; };
  }, [filterTier, debouncedSearch, supabase]);

  useEffect(() => {
    const handleRefresh = () => {
      setPage(0);
      fetchProducts(0, filterTier, debouncedSearch);
    };
    window.addEventListener("2q-refresh-products", handleRefresh);
    return () => window.removeEventListener("2q-refresh-products", handleRefresh);
  }, [filterTier, debouncedSearch]);

  if (isLoadingProducts && products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-mid animate-pulse">Đang tải sản phẩm...</div>
      </div>
    );
  }



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
          {products.map((p) => {
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
        {hasMore && (
          <div className="mt-8 mb-8 text-center">
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchProducts(nextPage, filterTier, debouncedSearch);
              }}
              disabled={isLoadingMore}
              className="px-6 py-2 border border-rule hover:bg-surface transition-colors font-medium text-sm rounded-sm disabled:opacity-50"
            >
              {isLoadingMore ? "Đang tải..." : "Xem thêm"}
            </button>
          </div>
        )}
        
        {!isLoadingProducts && products.length === 0 && (
          <div className="text-mid p-8 border border-rule text-center bg-surface mt-4">
            Không tìm thấy sản phẩm nào
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <CartPanel />
    </div>
  );
}
