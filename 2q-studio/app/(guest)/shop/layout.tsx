import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2Q Studio — Catalogue",
  description: "Explore the 2Q Studio collection. Chat on WhatsApp to order or inquire.",
};

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="sticky top-0 z-40 bg-ink text-paper px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-widest uppercase">2Q Studio</h1>
        <a
          href="https://wa.me/84896208698"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium border border-paper/40 px-3 py-1.5 rounded-sm hover:bg-paper/10 transition-colors"
        >
          WhatsApp
        </a>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-rule py-4 text-center text-mid text-xs">
        © 2Q Studio · Message us on WhatsApp to order
      </footer>
    </div>
  );
}
