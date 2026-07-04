"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function ensurePushSupport() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Trình duyệt này không hỗ trợ thông báo đẩy.");
  }
}

export async function subscribeCurrentDevice() {
  ensurePushSupport();

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Thiếu cấu hình VAPID public key.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  let created = false;

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      created = true;
    } catch (error) {
      console.error("Push subscribe error:", error);
      // If we fail to subscribe due to a key mismatch or stale SW, unregister it to self-heal on next load.
      await registration.unregister();
      throw new Error("Lỗi đăng ký dịch vụ. Vui lòng tải lại trang (F5) và thử lại.");
    }
  }

  const response = await fetch("/api/webpush/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      deviceName: navigator.platform || "Unknown Device",
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    if (created) await subscription.unsubscribe();
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error || "Không thể đăng ký thông báo cho thiết bị.");
  }

  return subscription;
}

export async function unsubscribeCurrentDevice() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const response = await fetch("/api/webpush/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok && response.status !== 401) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error || "Không thể hủy đăng ký thông báo.");
  }

  await subscription.unsubscribe();
}
