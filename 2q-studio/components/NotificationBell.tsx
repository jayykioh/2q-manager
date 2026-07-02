"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check browser permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);

      // Fetch existing unread or recent notifications
      const { data, error } = await supabase
        .from("notification_recipients")
        .select(`
          read_at,
          notifications ( id, type, title, message, created_at )
        `)
        .eq("user_id", uid)
        .order("notifications(created_at)", { ascending: false })
        .limit(20);

      if (!error && data) {
        const parsed = data.map((d: any) => ({
          ...d.notifications,
          read_at: d.read_at,
        })).filter(Boolean);
        setNotifications(parsed);
      }
    };

    init();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to realtime inserts on notification_recipients for this user
    const channel = supabase
      .channel('public:notification_recipients')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_recipients', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const notificationId = payload.new.notification_id;
          
          // Fetch the full notification details
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notificationId)
            .single();

          if (data && !error) {
            const newNotif: NotificationItem = { ...data, read_at: null };
            setNotifications(prev => [newNotif, ...prev]);
            
            // Show in-app toast
            toast.info(newNotif.title, { description: newNotif.message });

            // Show native browser notification if granted
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: "/favicon.ico"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Trình duyệt của bạn không hỗ trợ thông báo.");
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted") {
      toast.success("Đã cấp quyền nhận thông báo!");
    } else {
      toast.warning("Bạn đã từ chối nhận thông báo.");
    }
  };

  const markAsRead = async (id: string) => {
    if (!userId) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    
    await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('notification_id', id)
      .eq('user_id', userId);
  };
  
  const markAllAsRead = async () => {
    if (!userId) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    
    await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-sm hover:bg-surface transition-colors"
        title="Thông báo"
      >
        <Bell size={20} className="text-ink" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-paper border border-rule shadow-lg rounded-sm z-50 flex flex-col max-h-[80vh]">
          <div className="p-3 border-b border-rule flex justify-between items-center bg-surface sticky top-0 z-10">
            <h3 className="font-bold text-sm">Thông báo</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-mid hover:text-ink transition-colors" title="Đánh dấu đã đọc tất cả">
                  <Check size={16} />
                </button>
              )}
            </div>
          </div>
          
          {permission === "default" && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex flex-col gap-2">
              <p className="text-xs text-blue-800">Bật thông báo trình duyệt để không bỏ lỡ đơn hàng mới.</p>
              <button 
                onClick={requestPermission}
                className="text-xs bg-blue-600 text-white py-1 px-2 rounded-sm font-medium hover:bg-blue-700 w-fit transition-colors"
              >
                Cho phép thông báo
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-mid text-sm">Chưa có thông báo nào.</div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-3 border-b border-rule hover:bg-surface transition-colors ${!n.read_at ? 'bg-surface/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-ink">{n.title}</div>
                      <div className="text-[10px] text-mid shrink-0">
                        {new Date(n.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                      </div>
                    </div>
                    <div className="text-xs text-mid mb-2 break-words">{n.message}</div>
                    
                    {!n.read_at && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-[10px] text-mid hover:text-ink flex items-center gap-1"
                      >
                        <Check size={12} /> Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
