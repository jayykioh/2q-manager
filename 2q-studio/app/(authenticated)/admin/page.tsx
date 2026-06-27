"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, Package, FileText, Settings } from "lucide-react";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    activeProducts: 0
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchMetrics = async () => {
      const businessDate = new Date().toISOString().split("T")[0];

      const { data: todayOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("business_date", businessDate)
        .neq("status", "cancelled");

      const todayRev = todayOrders?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_stock");

      setMetrics({
        todayRevenue: todayRev,
        monthRevenue: 0, // Mock for MVP
        totalOrders: todayOrders?.length || 0,
        activeProducts: productCount || 0
      });
    };

    fetchMetrics();
  }, []);

  return (
    <div className="p-4">
      <h2 className="font-sans text-xl font-medium mb-6">Tổng quan Kinh doanh</h2>

      <div className="grid grid-cols-2 gap-[1px] bg-rule border border-rule">
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Doanh thu hôm nay</div>
          <div className="font-mono text-2xl">{metrics.todayRevenue.toLocaleString()}đ</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Đơn hàng hôm nay</div>
          <div className="font-mono text-2xl">{metrics.totalOrders}</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Sản phẩm tồn kho</div>
          <div className="font-mono text-2xl">{metrics.activeProducts}</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Doanh thu Tháng</div>
          <div className="font-mono text-2xl text-mid">--</div>
        </div>
      </div>

      <h2 className="font-sans text-xl font-medium mt-8 mb-4">Quản lý</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] bg-rule border border-rule">
        <Link href="/admin/products" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
          <Package size={24} className="text-ink" />
          <span className="font-medium">Sản phẩm</span>
        </Link>
        <Link href="/admin/orders" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
          <FileText size={24} className="text-ink" />
          <span className="font-medium">Đơn hàng</span>
        </Link>
        <Link href="/admin/team" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
          <Users size={24} className="text-ink" />
          <span className="font-medium">Nhân sự</span>
        </Link>
        <Link href="/admin/settings" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
          <Settings size={24} className="text-ink" />
          <span className="font-medium">Cài đặt</span>
        </Link>
      </div>
    </div>
  );
}
