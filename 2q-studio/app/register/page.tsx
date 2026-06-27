"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Use standard Supabase signUp
    // Our DB triggers will automatically set email_confirmed_at and create the public.profile
    const pseudoEmail = `${username}@2q.local`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: pseudoEmail,
      password: password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError("Tên đăng nhập này đã có người sử dụng.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // Because email confirmation is technically enabled on the project but our DB trigger 
    // auto-confirms it, signUp might not return a session immediately. 
    // We explicitly call signInWithPassword to get the session.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    });

    if (authError) {
      setError("Đăng ký thành công nhưng đăng nhập thất bại. Vui lòng quay lại trang Đăng nhập.");
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Save to localStorage
      const stored = localStorage.getItem("saved_users");
      const savedUsers = stored ? JSON.parse(stored) : [];
      
      const existingIdx = savedUsers.findIndex((u: any) => u.username === username);
      if (existingIdx === -1) {
        savedUsers.push({ username, role: 'staff' });
      } else {
        savedUsers[existingIdx] = { username, role: 'staff' };
      }
      localStorage.setItem("saved_users", JSON.stringify(savedUsers));

      router.push("/pos");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md p-8 bg-paper border border-rule animate-in fade-in duration-300">
        <h1 className="font-display text-4xl tracking-widest mb-8 text-center text-ink uppercase">2Q</h1>
        
        <h2 className="text-2xl font-medium mb-6 text-center">Đăng ký tài khoản</h2>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Tên đăng nhập (Username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-paper border border-rule p-3 text-lg focus:outline-none focus:border-ink"
              required
              autoFocus
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-paper border border-rule p-3 text-lg focus:outline-none focus:border-ink"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Mật khẩu (Ít nhất 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper border border-rule p-3 text-lg focus:outline-none focus:border-ink"
              required
              minLength={6}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading || !username || !password || !fullName}
            className="w-full bg-ink text-paper py-3 font-medium uppercase tracking-wider disabled:opacity-50 mt-2 hover:bg-black transition-colors"
          >
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => router.push('/login?manual=1')}
            className="text-mid hover:text-ink text-sm transition-colors"
          >
            Đã có tài khoản? Đăng nhập thủ công
          </button>
        </div>
      </div>
    </div>
  );
}
