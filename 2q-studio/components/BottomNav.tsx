"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, FileText, Clock, User, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { name: "POS", path: "/pos", icon: ShoppingBag },
  { name: "Đơn hàng", path: "/orders", icon: FileText },
  { name: "Ca làm", path: "/attendance", icon: Clock },
  { name: "Cá nhân", path: "/profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          setIsAdmin(true);
        }
      }
    };
    fetchRole();
  }, [supabase]);

  const currentNavItems = isAdmin 
    ? [{ name: "Quản lý", path: "/admin", icon: Shield }, ...NAV_ITEMS]
    : [...NAV_ITEMS];

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 w-full bg-destructive text-paper text-center py-1 text-xs font-medium z-[60]">
          Mất kết nối mạng. Bạn đang ở chế độ Offline.
        </div>
      )}
      <nav className="fixed bottom-0 w-full bg-paper border-t border-rule flex justify-around items-center h-[60px] z-50">
        {currentNavItems.map((item) => {
          const isActive = pathname === item.path || (item.path === "/admin" && pathname.startsWith("/admin"));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 relative h-full ${
                isActive ? "text-ink" : "text-mid"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-[20px] h-[2px] bg-ink" />
              )}
              <Icon size={20} className="mb-1" />
              <span className="text-[10px] font-medium leading-none">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
