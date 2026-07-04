"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, Package, FileText, Settings, Wallet } from "lucide-react";

interface AdminDashboardMetrics {
  net_revenue: number;
  gross_income: number;
  refund_amount: number;
  net_cash: number;
  total_orders: number;
  active_products: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    grossIncome: 0,
    refundAmount: 0,
    netCash: 0,
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
        todayRevenue: Number(dashboardMetrics.net_revenue),
        grossIncome: Number(dashboardMetrics.gross_income),
        refundAmount: Number(dashboardMetrics.refund_amount),
        netCash: Number(dashboardMetrics.net_cash),
        totalOrders: Number(dashboardMetrics.total_orders),
        activeProducts: Number(dashboardMetrics.active_products),
      });
    };

    fetchMetrics();
  }, [supabase]);

  return (
    <div className="p-4">
      <h2 className="font-sans text-xl font-medium mb-6">Tổng quan Kinh doanh</h2>

      <div className="grid grid-cols-2 gap-[1px] bg-rule border border-rule">
        <div className="bg-paper p-4">
          <div className="text-sm text-mid mb-2">Doanh thu hôm nay</div>
          <div className="font-mono text-2xl">{metrics.todayRevenue.toLocaleString()}đ</div>
          <div className="text-[10px] text-mid mt-1">
            Gộp {metrics.grossIncome.toLocaleString()}đ · Hoàn {metrics.refundAmount.toLocaleString()}đ
          </div>
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
          <div className="text-sm text-mid mb-2">Thực thu hôm nay</div>
          <div className="font-mono text-2xl">{metrics.netCash.toLocaleString()}đ</div>
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
