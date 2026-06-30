"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ThemeSelector } from "@/components/ThemeSelector";

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    personalRevenue: 0,
    totalIncome: 0,
    totalExpense: 0,
  });
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profData);

      // Get today's metrics
      const businessDate = new Date().toISOString().split("T")[0]; // MVP client date approximation
      
      const [ordersResponse, transactionsResponse] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .eq("created_by", user.id)
          .eq("business_date", businessDate)
          .neq("status", "cancelled"),
        profData.role === "admin" 
          ? supabase
              .from("transactions")
              .select("type, amount")
              .eq("business_date", businessDate)
          : Promise.resolve({ data: null })
      ]);

      const personalRev = ordersResponse.data?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;
      
      let totalIn = 0;
      let totalOut = 0;
      
      if (transactionsResponse.data) {
        transactionsResponse.data.forEach(t => {
          if (t.type === 'in') totalIn += Number(t.amount);
          if (t.type === 'out') totalOut += Number(t.amount);
        });
      }

      setMetrics({
        personalRevenue: personalRev,
        totalIncome: totalIn,
        totalExpense: totalOut
      });
    };

    fetchProfile();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    setPasswordLoading(true);
    setPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: "Đổi mật khẩu thành công!" });
      setNewPassword("");
    }
    setPasswordLoading(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!profile) return <div className="p-4 text-mid">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-8">
        <BackButton />
        <h2 className="font-sans text-xl font-medium">Thông tin Cá nhân</h2>
      </div>
      
      <div className="bg-paper border border-rule p-4 mb-6">
        <div className="font-display text-2xl mb-1">{profile.full_name}</div>
        <div className="text-mid uppercase text-sm font-medium">{profile.role}</div>
      </div>

      <div className="bg-surface border border-rule p-4 mb-4">
        <div className="text-sm text-mid mb-2">Doanh số cá nhân hôm nay</div>
        <div className="font-mono text-3xl">{metrics.personalRevenue.toLocaleString()} đ</div>
      </div>

      {profile.role === "admin" && (
        <div className="grid grid-cols-2 gap-[1px] bg-rule border border-rule mb-8">
          <div className="bg-paper p-4">
            <div className="text-sm text-mid mb-2">Tổng thu cửa hàng</div>
            <div className="font-mono text-xl text-green-600">+{metrics.totalIncome.toLocaleString()} đ</div>
          </div>
          <div className="bg-paper p-4">
            <div className="text-sm text-mid mb-2">Tổng chi cửa hàng</div>
            <div className="font-mono text-xl text-destructive">-{metrics.totalExpense.toLocaleString()} đ</div>
          </div>
          <div className="bg-paper p-4 col-span-2">
            <div className="text-sm text-mid mb-2">Chênh lệch (Thực thu)</div>
            <div className="font-mono text-2xl">{(metrics.totalIncome - metrics.totalExpense).toLocaleString()} đ</div>
          </div>
        </div>
      )}

      <ThemeSelector />

      <div className="bg-paper border border-rule p-4">
        <h3 className="font-medium mb-4">Đổi mật khẩu</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
          <input
            type="password"
            placeholder="Nhập mật khẩu mới"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border border-rule bg-paper p-3 focus:outline-none focus:border-ink"
            required
            minLength={6}
          />
          
          {passwordMessage && (
            <div className={`text-sm ${passwordMessage.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading || !newPassword}
            className="w-full py-3 bg-ink text-paper font-medium disabled:opacity-50"
          >
            {passwordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>

      <div className="mt-8 border-t border-rule pt-8">
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full py-3 border border-rule text-destructive font-medium hover:bg-surface transition-colors disabled:opacity-50"
        >
          {logoutLoading ? "Đang xử lý..." : "Đăng xuất"}
        </button>
      </div>
    </div>
  );
}
