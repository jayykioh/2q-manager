"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCog } from "lucide-react";
import { BackButton } from "@/components/BackButton";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export default function AdminTeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("role").order("full_name");
    if (data) setProfiles(data);
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPassword) return;

    setActionLoading(true);
    setActionMessage(null);

    const { error } = await supabase.rpc('admin_change_user_password', {
      p_target_user_id: selectedUserId,
      p_new_password: newPassword
    });

    if (error) {
      setActionMessage({ type: 'error', text: error.message });
    } else {
      setActionMessage({ type: 'success', text: "Đổi mật khẩu thành công!" });
      setNewPassword("");
      setTimeout(() => setSelectedUserId(null), 2000);
    }
    setActionLoading(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BackButton />
        <h2 className="font-sans text-xl font-medium">Quản lý Nhân sự</h2>
      </div>

      {loading ? (
        <div className="text-mid">Đang tải...</div>
      ) : (
        <div className="space-y-4">
          {profiles.map(profile => (
            <div key={profile.id} className="border border-rule p-4 bg-paper flex items-center justify-between">
              <div>
                <div className="font-medium text-lg">{profile.full_name}</div>
                <div className="text-sm text-mid uppercase tracking-wider mt-1">{profile.role}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedUserId(selectedUserId === profile.id ? null : profile.id);
                  setActionMessage(null);
                  setNewPassword("");
                }}
                className="flex items-center gap-2 px-3 py-2 border border-rule hover:bg-surface transition-colors text-sm font-medium"
              >
                <UserCog size={16} />
                Đổi MK
              </button>
            </div>
          ))}

          {selectedUserId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-paper border border-rule p-6 w-full max-w-md animate-in fade-in duration-200">
                <h3 className="text-lg font-medium mb-4">
                  Đổi mật khẩu cho {profiles.find(p => p.id === selectedUserId)?.full_name}
                </h3>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-rule bg-paper p-3 focus:outline-none focus:border-ink"
                    required
                    minLength={6}
                  />
                  
                  {actionMessage && (
                    <div className={`text-sm ${actionMessage.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
                      {actionMessage.text}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(null)}
                      className="flex-1 py-3 border border-rule font-medium hover:bg-surface transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || !newPassword}
                      className="flex-1 py-3 bg-ink text-paper font-medium disabled:opacity-50"
                    >
                      {actionLoading ? "Đang lưu..." : "Xác nhận"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
