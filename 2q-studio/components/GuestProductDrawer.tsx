"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { GuestProduct } from "@/app/(guest)/shop/page";

const WHATSAPP_NUMBER = "84896208698";

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const TYPE_LABELS: Record<string, string> = {
  bracelet: "Bracelet",
  ring: "Ring",
  earring: "Earrings",
  keychain: "Keychain",
  necklace: "Necklace",
  spoon: "Spoon",
  fork: "Fork",
  other: "Other",
};

interface GuestProductDrawerProps {
  product: GuestProduct;
  onClose: () => void;
}

export function GuestProductDrawer({ product, onClose }: GuestProductDrawerProps) {
  const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
  const imageUrls = images
    .map((img) => img.public_url)
    .filter((url): url is string => Boolean(url));

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((i) => (i + 1) % Math.max(imageUrls.length, 1));
      if (e.key === "ArrowLeft") setCurrentIndex((i) => (i - 1 + Math.max(imageUrls.length, 1)) % Math.max(imageUrls.length, 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrls.length, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello 2Q Studio, I'm interested in this item:\n` +
      `• SKU: ${product.sku}\n` +
      `• Product: ${product.name}\n` +
      `• Price: ${product.base_price.toLocaleString("en-US")} VND\n\n` +
      `Could you provide more details about this item?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const currentImageUrl = imageUrls.length > 0 ? imageUrls[currentIndex] : FALLBACK_IMAGE;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel — slides up from bottom on mobile, centered modal on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div className="bg-paper w-full md:max-w-2xl md:rounded-sm md:shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden rounded-t-2xl md:rounded-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule shrink-0">
            <span className="font-display text-lg tracking-wide">{product.sku}</span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface rounded-sm transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            {/* Image carousel */}
            <div className="relative aspect-square w-full bg-surface">
              <Image
                src={currentImageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-contain"
                priority
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).srcset = "";
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />

              {imageUrls.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={() => setCurrentIndex((i) => (i + 1) % imageUrls.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                  >
                    <ChevronRight size={22} />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {imageUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {currentIndex + 1}/{imageUrls.length}
                  </div>
                </>
              )}
            </div>

            {/* Product info */}
            <div className="px-4 py-4 space-y-3">
              <div>
                <h2 className="font-sans font-bold text-xl">{product.name}</h2>
                <p className="text-mid text-sm mt-1">
                  {TYPE_LABELS[product.type] ?? product.type}
                  {product.tier === "premium" && (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-amber-600">Premium</span>
                  )}
                </p>
              </div>

              <div className="font-mono text-2xl font-bold">
                {product.base_price.toLocaleString("en-US")} VND
              </div>

              {product.note && (
                <p className="text-sm text-mid border-l-2 border-rule pl-3 leading-relaxed">
                  {product.note}
                </p>
              )}

              <p className="text-xs text-mid">
                Message us to ask about sizing, custom requests, or ordering. We will reply as soon as possible! ✨
              </p>
            </div>
          </div>

          {/* Sticky WhatsApp CTA */}
          <div className="px-4 py-3 border-t border-rule shrink-0">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white font-bold text-sm rounded-sm hover:bg-[#1ebe5d] active:scale-[0.98] transition-all"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
