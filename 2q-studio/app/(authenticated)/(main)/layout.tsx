import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";
import { HeaderTime } from "@/components/HeaderTime";
import { NotificationBell } from "@/components/NotificationBell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink pb-[60px]">
      <header className="full-ink-header px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/pos">
          <h1 className="font-display text-2xl tracking-wide">2Q POS</h1>
        </Link>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <HeaderTime />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
