"use client";

function urlBase64ToUint8Array(input: string) {
  const base64String = input.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(base64String)) {
    throw new Error("VAPID public key không đúng định dạng base64url.");
  }

  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = Uint8Array.from(rawData, (character) => character.charCodeAt(0));

  if (bytes.length !== 65 || bytes[0] !== 4) {
    throw new Error("VAPID public key không phải P-256 public key hợp lệ.");
  }

  return bytes;
}

function ensurePushSupport() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Trình duyệt này không hỗ trợ thông báo đẩy.");
  }
}

async function fetchVapidPublicKey() {
  const response = await fetch("/api/webpush/vapid-public-key", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const result = await response.json().catch(() => null) as {
    publicKey?: unknown;
    error?: string;
  } | null;

  if (!response.ok || typeof result?.publicKey !== "string") {
    throw new Error(result?.error || "Server chưa cấu hình VAPID public key hợp lệ.");
  }

  return urlBase64ToUint8Array(result.publicKey);
}

function subscriptionUsesKey(subscription: PushSubscription, publicKey: Uint8Array) {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;

  const currentBytes = new Uint8Array(currentKey);
  return currentBytes.length === publicKey.length
    && currentBytes.every((value, index) => value === publicKey[index]);
}

export async function subscribeCurrentDevice() {
  ensurePushSupport();

  const publicKey = await fetchVapidPublicKey();

  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !subscriptionUsesKey(subscription, publicKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  let created = false;

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      created = true;
    } catch (error) {
      console.error("Push subscribe error:", error);
      if (error instanceof Error && error.message.includes("push service error")) {
        throw new Error("Trình duyệt của bạn đang chặn hoặc không kết nối được dịch vụ Thông báo đẩy (ví dụ: đang dùng tab Ẩn danh, hoặc trình duyệt Brave chặn Google Services). Vui lòng thử lại trên trình duyệt Chrome/Safari bình thường.");
      }
      if (error instanceof Error && error.message.includes("applicationServerKey")) {
        throw new Error("VAPID public key trên server không hợp lệ.");
      }
      throw new Error("Lỗi kết nối dịch vụ thông báo. Vui lòng thử lại sau.");
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

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
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
