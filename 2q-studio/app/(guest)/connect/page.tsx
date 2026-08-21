import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, ArrowLeft, ShoppingBag, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "2Q Studio — Connect & Channels",
  description: "Connect with 2Q Studio. Browse our online catalogue, find our studio in Da Nang, or message us directly.",
};

const Facebook = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const links = [
  {
    name: "Online Catalogue",
    desc: "Browse collection & inquire via WhatsApp",
    href: "/shop",
    icon: ShoppingBag,
    highlight: true,
  },
  {
    name: "WhatsApp",
    desc: "Chat directly: +84 896 208 698",
    href: "https://wa.me/84896208698",
    icon: MessageCircle,
    external: true,
  },
  {
    name: "Google Maps",
    desc: "27 Nguyễn Cao Luyện, Sơn Trà, Đà Nẵng",
    href: "https://maps.app.goo.gl/9y3rNzMZapsXsHDT9",
    icon: MapPin,
    external: true,
  },
  {
    name: "Facebook",
    desc: "Follow our story & updates",
    href: "https://www.facebook.com/profile.php?id=61577127505025",
    icon: Facebook,
    external: true,
  },
  {
    name: "Instagram",
    desc: "@2qnhanthuat · Handcrafted jewelry",
    href: "https://www.instagram.com/2qnhanthuat",
    icon: Instagram,
    external: true,
  },
];

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-widest uppercase mb-2">2Q Studio</h1>
          <p className="text-xs text-mid uppercase tracking-widest">Da Nang · Handcrafted Jewelry</p>
        </div>

        {/* Links Array */}
        <div className="w-full flex flex-col gap-3">
          {links.map((link) => {
            const isInternal = link.href.startsWith("/");
            const Component = isInternal ? Link : "a";
            const props = isInternal
              ? { href: link.href }
              : { href: link.href, target: "_blank", rel: "noopener noreferrer" };

            return (
              <Component
                key={link.name}
                {...props}
                className={`group flex items-center p-4 border transition-all rounded-sm ${
                  link.highlight
                    ? "bg-ink text-paper border-ink hover:opacity-90 shadow-sm"
                    : "bg-paper text-ink border-rule hover:bg-surface"
                }`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-sm shrink-0 mr-4 ${
                    link.highlight ? "bg-paper/10 text-paper" : "bg-surface text-ink border border-rule"
                  }`}
                >
                  <link.icon size={20} />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="font-sans font-bold text-sm leading-tight truncate">{link.name}</div>
                  <div
                    className={`text-xs mt-0.5 truncate ${
                      link.highlight ? "text-paper/70" : "text-mid"
                    }`}
                  >
                    {link.desc}
                  </div>
                </div>

                <div className="ml-2 text-xs font-mono opacity-50 group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </div>
              </Component>
            );
          })}
        </div>

        {/* Back Link */}
        <div className="mt-10">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs text-mid hover:text-ink transition-colors uppercase tracking-wider font-medium"
          >
            <ArrowLeft size={14} />
            Back to Catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
