import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-mid animate-pulse">
        <Loader2 className="animate-spin text-ink" size={32} />
        <span className="font-sans font-medium text-sm uppercase tracking-wider">Đang tải dữ liệu...</span>
      </div>
    </div>
  );
}
