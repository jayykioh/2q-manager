"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { subscribeCurrentDevice } from "@/lib/push-notifications";

export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "denied" : Notification.permission
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission !== "granted") return;

    void subscribeCurrentDevice().catch((error: unknown) => {
      console.error("Failed to refresh push subscription", error);
    });
  }, [permission]);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Trình duyệt này không hỗ trợ thông báo.");
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.warning("Bạn chưa cấp quyền nhận thông báo.");
        return;
      }

      await subscribeCurrentDevice();
      toast.success("Đã bật thông báo cho thiết bị này.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể bật thông báo.");
    } finally {
      setLoading(false);
    }
  };

  const enabled = permission === "granted";

  return (
    <button
      type="button"
      onClick={requestPermission}
      disabled={loading}
      className="relative rounded-sm p-2 transition-colors hover:bg-surface disabled:opacity-50"
      title={enabled ? "Thông báo đã được bật" : "Bật thông báo"}
      aria-label={enabled ? "Thông báo đã được bật" : "Bật thông báo"}
    >
      {loading ? (
        <LoaderCircle size={20} className="animate-spin text-mid" />
      ) : enabled ? (
        <Bell size={20} className="text-blue-600" />
      ) : (
        <BellOff size={20} className="text-mid" />
      )}
    </button>
  );
}
