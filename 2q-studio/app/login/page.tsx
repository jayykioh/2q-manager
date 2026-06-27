"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, ArrowLeft } from "lucide-react";

type ServerUser = {
  id: string;
  username: string;
  full_name: string;
  role: string;
};

type Mode = "select_user" | "enter_password" | "add_user";

export default function LoginPage() {
  const [serverUsers, setServerUsers] = useState<ServerUser[]>([]);
  const [mode, setMode] = useState<Mode>("select_user");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [password, setPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const isManual = new URLSearchParams(window.location.search).get("manual") === "1";
    
    if (isManual) {
      setMode("add_user");
      setFetchingUsers(false);
      return;
    }

    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("id, username, full_name, role");
      
      if (data && data.length > 0) {
        setServerUsers(data);
        setMode("select_user");
      } else {
        router.push("/register");
      }
      setFetchingUsers(false);
    };

    fetchUsers();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetUsername = mode === "enter_password" ? selectedUser : newUsername;
    const pseudoEmail = `${targetUsername}@2q.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    });

    if (error) {
      setError("Sai tài khoản hoặc mật khẩu.");
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch profile to get exact role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/pos");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md p-8 bg-paper border border-rule">
        <h1 className="font-display text-4xl tracking-widest mb-8 text-center text-ink uppercase">2Q</h1>
        
        {mode === "select_user" && !fetchingUsers && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-xl font-medium text-center mb-6">Ai đang đăng nhập?</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {serverUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user.username);
                    setPassword("");
                    setError(null);
                    setMode("enter_password");
                  }}
                  className="flex flex-col items-center group transition-transform hover:scale-105 relative"
                >
                  {user.role === "admin" && (
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 border border-rule z-10 shadow-sm">
                      ADMIN
                    </div>
                  )}
                  <div className="w-24 h-24 bg-ink flex items-center justify-center border border-rule group-hover:border-mid transition-colors mb-2">
                    <span className="text-4xl text-paper font-display uppercase">
                      {user.username.substring(0, 1)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-mid group-hover:text-ink">{user.full_name}</span>
                </button>
              ))}
              
              <button
                onClick={() => router.push("/register")}
                className="flex flex-col items-center group transition-transform hover:scale-105"
              >
                <div className="w-24 h-24 bg-surface flex items-center justify-center border border-rule group-hover:border-mid transition-colors mb-2">
                  <Plus size={36} className="text-mid group-hover:text-ink" />
                </div>
                <span className="text-sm font-medium text-mid group-hover:text-ink">Tạo tài khoản</span>
              </button>
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setNewUsername("");
                  setPassword("");
                  setError(null);
                  setMode("add_user");
                }}
                className="text-mid hover:text-ink text-sm transition-colors"
              >
                Đăng nhập tài khoản khác
              </button>
            </div>
          </div>
        )}

        {mode === "enter_password" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <button 
              type="button"
              onClick={() => {
                setMode("select_user");
                setError(null);
              }}
              className="flex items-center text-mid hover:text-ink text-sm mb-4"
            >
              <ArrowLeft size={16} className="mr-1" />
              Quay lại
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-ink flex items-center justify-center border border-rule">
                <span className="text-2xl text-paper font-display uppercase">
                  {selectedUser.substring(0, 1)}
                </span>
              </div>
              <h2 className="text-2xl font-medium">{selectedUser}</h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-paper border border-rule p-3 text-lg focus:outline-none focus:border-ink"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-ink text-paper py-3 font-medium uppercase tracking-wider disabled:opacity-50 mt-2 hover:bg-black transition-colors"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </div>
        )}

        {mode === "add_user" && !fetchingUsers && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            {serverUsers.length > 0 && (
              <button 
                type="button"
                onClick={() => {
                  setMode("select_user");
                  setError(null);
                }}
                className="flex items-center text-mid hover:text-ink text-sm mb-6"
              >
                <ArrowLeft size={16} className="mr-1" />
                Quay lại
              </button>
            )}
            
            <h2 className="text-2xl font-medium mb-6 text-center">Đăng nhập hệ thống</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-paper border border-rule p-3 focus:outline-none focus:border-ink"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-paper border border-rule p-3 focus:outline-none focus:border-ink"
                  required
                />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <button
                type="submit"
                disabled={loading || !newUsername || !password}
                className="w-full bg-ink text-paper py-3 font-medium uppercase tracking-wider disabled:opacity-50 mt-4 hover:bg-black transition-colors"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                onClick={() => router.push('/register')}
                className="text-mid hover:text-ink text-sm transition-colors"
              >
                Chưa có tài khoản? Đăng ký mới
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
