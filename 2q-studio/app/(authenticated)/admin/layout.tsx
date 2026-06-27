import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink pb-[60px]">
      <header className="full-ink-header px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link href="/admin">
          <h1 className="font-display text-2xl tracking-wide">2Q ADMIN</h1>
        </Link>
        <div className="text-sm font-sans">Admin User</div>
      </header>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
