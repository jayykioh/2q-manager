"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { GuestProductDrawer } from "@/components/GuestProductDrawer";

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

interface ProductImage {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface GuestProduct {
  id: string;
  sku: string;
  name: string;
  type: string;
  tier: string;
  base_price: number;
  note?: string | null;
  product_images: ProductImage[];
}

const PAGE_SIZE = 12;

const TIER_LABELS: Record<string, string> = {
  all: "All",
  standard: "Standard",
  premium: "Premium",
  done: "Completed",
};

export default function ShopPage() {
  const [products, setProducts] = useState<GuestProduct[]>([]);
  const [filterTier, setFilterTier] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GuestProduct | null>(null);
  const [supabase] = useState(createClient);

  const fetchProducts = async (pageIndex: number, tier: string) => {
    setIsLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("products")
      .select("id, sku, name, type, tier, base_price, note, product_images(public_url, is_primary, sort_order)", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (tier !== "all") {
      query = query.eq("tier", tier);
    }

    const { data, count } = await query.range(from, to);

    if (data) {
      if (pageIndex === 0) {
        setProducts(data as GuestProduct[]);
      } else {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = (data as GuestProduct[]).filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });
      }
      setHasMore(count !== null && from + PAGE_SIZE < count);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setPage(0);
    fetchProducts(0, filterTier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTier]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProducts(next, filterTier);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Tier filter */}
      <div className="flex gap-2 flex-wrap mb-6 text-sm font-medium">
        {Object.entries(TIER_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterTier(key)}
            className={`px-3 py-1.5 border transition-colors ${
              filterTier === key
                ? "bg-ink text-paper border-ink"
                : "bg-paper text-ink border-rule hover:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => {
          const images = p.product_images || [];
          const primary = images.find((img) => img.is_primary) || images[0];
          const imageUrl = primary?.public_url ?? FALLBACK_IMAGE;

          return (
            <div
              key={p.id}
              className="bg-paper border border-rule flex flex-col group cursor-pointer"
              onClick={() => setSelectedProduct(p)}
            >
              {/* Image */}
              <div className="aspect-square w-full bg-surface border-b border-rule relative overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).srcset = "";
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    1/{images.length}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col flex-1">
                <div className="font-display text-base leading-tight truncate" title={p.sku}>
                  {p.sku}
                </div>
                <div className="text-xs text-mid truncate mt-0.5" title={p.name}>
                  {p.name}
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-medium">
                    {p.base_price.toLocaleString("en-US")} VND
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(p);
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 bg-ink text-paper hover:opacity-80 transition-opacity rounded-sm whitespace-nowrap"
                  >
                    Inquire
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!isLoading && products.length === 0 && (
        <div className="text-mid p-12 border border-rule text-center bg-surface mt-4">
          No products available
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 border border-rule hover:bg-surface transition-colors font-medium text-sm rounded-sm disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {/* Product drawer */}
      {selectedProduct && (
        <GuestProductDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
