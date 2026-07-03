"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  
  const supabase = createClient();

  useEffect(() => {
    // Check browser permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
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
            // Show native PWA browser notification if granted
            if ("Notification" in window && Notification.permission === "granted") {
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                  registration.showNotification(data.title, {
                    body: data.body,
                    icon: "/favicon.ico"
                  });
                }).catch(() => {
                  new Notification(data.title, {
                    body: data.body,
                    icon: "/favicon.ico"
                  });
                });
              } else {
                new Notification(data.title, {
                  body: data.body,
                  icon: "/favicon.ico"
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

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

  const isGranted = permission === "granted";

  return (
    <button 
      onClick={!isGranted ? requestPermission : undefined} 
      className="relative p-2 rounded-sm hover:bg-surface transition-colors"
      title={isGranted ? "Thông báo đã được bật" : "Bật thông báo"}
    >
      {isGranted ? (
        <Bell size={20} className="text-blue-600" />
      ) : (
        <div className="relative">
          <BellOff size={20} className="text-mid" />
        </div>
      )}
    </button>
  );
}
