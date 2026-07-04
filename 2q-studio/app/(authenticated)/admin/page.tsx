"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, Package, FileText, Settings, Wallet } from "lucide-react";

interface AdminDashboardMetrics {
  revenue: number;
  operating_expense: number;
  difference: number;
  total_orders: number;
  active_products: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    operatingExpense: 0,
    difference: 0,
    totalOrders: 0,
    activeProducts: 0
  });
  const [supabase] = useState(createClient);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data, error } = await supabase
        .rpc("get_admin_dashboard_metrics")
        .single();

      if (error || !data) return;
      const dashboardMetrics = data as AdminDashboardMetrics;

      setMetrics({
        revenue: Number(dashboardMetrics.revenue),
        operatingExpense: Number(dashboardMetrics.operating_expense),
        difference: Number(dashboardMetrics.difference),
        totalOrders: Number(dashboardMetrics.total_orders),
        activeProducts: Number(dashboardMetrics.active_products),
      });
    };

    fetchMetrics();
  }, [supabase]);

  return (
    <div className="p-4">
      <h2 className="font-sans text-xl font-medium mb-6">Tổng quan Kinh doanh</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1px] bg-rule border border-rule">
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Doanh thu hôm nay</div>
          <div className="font-mono text-2xl">{metrics.revenue.toLocaleString()}đ</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Chi vận hành hôm nay</div>
          <div className="font-mono text-2xl">{metrics.operatingExpense.toLocaleString()}đ</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Chênh lệch hôm nay</div>
          <div className="font-mono text-2xl">{metrics.difference.toLocaleString()}đ</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[1px] bg-rule border border-rule mt-4">
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Đơn hàng hôm nay</div>
          <div className="font-mono text-2xl">{metrics.totalOrders}</div>
        </div>
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Sản phẩm tồn kho</div>
          <div className="font-mono text-2xl">{metrics.activeProducts}</div>
        </div>
      </div>

      <h2 className="font-sans text-xl font-medium mt-8 mb-4">Quản lý</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] bg-rule border border-rule">
        <Link href="/products" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
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
        <Link href="/admin/transactions" className="bg-paper p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface transition-colors aspect-square">
          <Wallet size={24} className="text-ink" />
          <span className="font-medium">Thu Chi</span>
        </Link>
      </div>
    </div>
  );
}
