"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
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
    };

    fetchProfile();
  }, [supabase]);

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
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BackButton />
        <h2 className="font-sans text-xl font-medium">Cài đặt Tài khoản</h2>
      </div>

      <div className="bg-paper border border-rule p-4 mb-8">
        <div className="font-display text-2xl mb-1">{profile.full_name}</div>
        <div className="text-mid uppercase text-sm font-medium">{profile.role}</div>
      </div>

      <div className="bg-paper border border-rule p-4 mb-8">
        <h3 className="font-medium mb-4">Đổi mật khẩu cá nhân</h3>
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

      <div className="border-t border-rule pt-8">
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
