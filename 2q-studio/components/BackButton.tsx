"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className="p-2 -ml-2 mr-1 hover:bg-surface rounded-full transition-colors text-mid hover:text-ink shrink-0"
      aria-label="Quay lại"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
