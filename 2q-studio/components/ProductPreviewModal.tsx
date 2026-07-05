"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface ProductPreviewModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function ProductPreviewModal({
  images,
  onClose,
  currentIndex,
  onIndexChange,
}: ProductPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextImage(e as unknown as React.MouseEvent);
      if (e.key === "ArrowLeft") prevImage(e as unknown as React.MouseEvent);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose]);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange((currentIndex + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 rounded-full transition-colors z-50"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X size={24} />
      </button>

      <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
        {images.length > 1 && (
          <button
            onClick={prevImage}
            className="absolute left-2 md:-left-12 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors z-10"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div
          className="relative w-full aspect-square md:aspect-auto md:h-[80vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-full max-w-[80vw] max-h-[80vh]">
            <Image
              src={images[currentIndex]}
              alt="Product preview"
              fill
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {images.length > 1 && (
          <button
            onClick={nextImage}
            className="absolute right-2 md:-right-12 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors z-10"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div
          className="absolute bottom-8 left-0 right-0 flex justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-white" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
