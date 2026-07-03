import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const MAX_DELIVERY_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 240];

interface OutboxJob {
  id: string;
  notification_id: string;
  attempts: number;
}

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface RecipientRecord {
  user_id: string;
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface DeliveryRecord {
  id: string;
  subscription_id: string;
  user_id: string;
  attempts: number;
}

function statusCodeFrom(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Unknown push delivery error";
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "Notification worker configuration is incomplete" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimedJobs, error: claimError } = await supabase
    .rpc("claim_notification_outbox", { p_limit: 25 });

  if (claimError) {
    console.error("Failed to claim notification jobs", claimError);
    return NextResponse.json({ error: "Failed to claim notification jobs" }, { status: 500 });
  }

  const jobs = (claimedJobs || []) as OutboxJob[];
  let completed = 0;
  let deferred = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const { data: notification, error: notificationError } = await supabase
        .from("notifications")
        .select("id, title, body, data")
        .eq("id", job.notification_id)
        .single<NotificationRecord>();
      if (notificationError) throw notificationError;

      const { data: recipientRows, error: recipientError } = await supabase
        .from("notification_recipients")
        .select("user_id")
        .eq("notification_id", notification.id);
      if (recipientError) throw recipientError;
      const recipients = (recipientRows || []) as RecipientRecord[];
      const userIds = recipients.map((recipient) => recipient.user_id);

      let subscriptions: SubscriptionRecord[] = [];
      if (userIds.length > 0) {
        const { data: subscriptionRows, error: subscriptionError } = await supabase
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth_key")
          .in("user_id", userIds)
          .is("revoked_at", null);
        if (subscriptionError) throw subscriptionError;
        subscriptions = (subscriptionRows || []) as SubscriptionRecord[];
      }

      if (subscriptions.length === 0) {
        if (userIds.length > 0) {
          const { error } = await supabase
            .from("notification_recipients")
            .update({ push_status: "no_subscription" })
            .eq("notification_id", notification.id);
          if (error) throw error;
        }
      } else {
        const deliveryRows = subscriptions.map((subscription) => ({
          notification_id: notification.id,
          subscription_id: subscription.id,
          user_id: subscription.user_id,
        }));
        const { error: deliveryCreateError } = await supabase
          .from("notification_push_deliveries")
          .upsert(deliveryRows, {
            onConflict: "notification_id,subscription_id",
            ignoreDuplicates: true,
          });
        if (deliveryCreateError) throw deliveryCreateError;

        const { data: pendingRows, error: pendingError } = await supabase
          .from("notification_push_deliveries")
          .select("id, subscription_id, user_id, attempts")
          .eq("notification_id", notification.id)
          .eq("status", "pending")
          .lte("available_at", new Date().toISOString());
        if (pendingError) throw pendingError;

        const pendingDeliveries = (pendingRows || []) as DeliveryRecord[];
        const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

        for (const delivery of pendingDeliveries) {
          const subscription = subscriptionsById.get(delivery.subscription_id);
          if (!subscription) continue;

          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
            }, JSON.stringify({
              title: notification.title,
              body: notification.body,
              icon: "/favicon.ico",
              tag: notification.id,
              data: notification.data || {},
            }));

            const deliveredAt = new Date().toISOString();
            const { error: deliveryUpdateError } = await supabase
              .from("notification_push_deliveries")
              .update({
                status: "delivered",
                attempts: delivery.attempts + 1,
                delivered_at: deliveredAt,
                last_error: null,
                updated_at: deliveredAt,
              })
              .eq("id", delivery.id);
            if (deliveryUpdateError) throw deliveryUpdateError;

            const { error: recipientUpdateError } = await supabase
              .from("notification_recipients")
              .update({ push_status: "delivered", delivered_at: deliveredAt })
              .eq("notification_id", notification.id)
              .eq("user_id", delivery.user_id);
            if (recipientUpdateError) throw recipientUpdateError;
          } catch (error: unknown) {
            const statusCode = statusCodeFrom(error);
            const attempts = delivery.attempts + 1;
            const permanent = statusCode === 404 || statusCode === 410 || attempts >= MAX_DELIVERY_ATTEMPTS;
            const now = new Date();
            const { error: deliveryUpdateError } = await supabase
              .from("notification_push_deliveries")
              .update({
                status: permanent ? "permanent_failed" : "pending",
                attempts,
                available_at: permanent
                  ? now.toISOString()
                  : addMinutes(now, RETRY_DELAYS_MINUTES[Math.min(attempts - 1, RETRY_DELAYS_MINUTES.length - 1)]),
                last_error: messageFrom(error).slice(0, 2000),
                updated_at: now.toISOString(),
              })
              .eq("id", delivery.id);
            if (deliveryUpdateError) throw deliveryUpdateError;

            if (statusCode === 404 || statusCode === 410) {
              const { error: subscriptionRevokeError } = await supabase
                .from("push_subscriptions")
                .update({ revoked_at: now.toISOString() })
                .eq("id", subscription.id);
              if (subscriptionRevokeError) throw subscriptionRevokeError;
            }
          }
        }
      }

      const { data: retryableRows, error: retryableError } = await supabase
        .from("notification_push_deliveries")
        .select("available_at")
        .eq("notification_id", notification.id)
        .eq("status", "pending")
        .order("available_at", { ascending: true })
        .limit(1);
      if (retryableError) throw retryableError;

      const nextAvailableAt = retryableRows?.[0]?.available_at as string | undefined;
      const finished = !nextAvailableAt;
      const now = new Date().toISOString();
      const { error: outboxUpdateError } = await supabase
        .from("notification_outbox")
        .update(finished ? {
          status: "completed",
          processed_at: now,
          processing_started_at: null,
          updated_at: now,
        } : {
          status: "pending",
          available_at: nextAvailableAt,
          processing_started_at: null,
          updated_at: now,
        })
        .eq("id", job.id);
      if (outboxUpdateError) throw outboxUpdateError;

      if (finished) completed += 1;
      else deferred += 1;
    } catch (error: unknown) {
      console.error(`Notification job ${job.id} failed`, error);
      const attempts = job.attempts + 1;
      const terminal = attempts >= MAX_DELIVERY_ATTEMPTS;
      const now = new Date();
      const { error: failureUpdateError } = await supabase
        .from("notification_outbox")
        .update({
          status: terminal ? "failed" : "pending",
          attempts,
          available_at: terminal
            ? now.toISOString()
            : addMinutes(now, RETRY_DELAYS_MINUTES[Math.min(attempts - 1, RETRY_DELAYS_MINUTES.length - 1)]),
          processing_started_at: null,
          last_error: messageFrom(error).slice(0, 2000),
          updated_at: now.toISOString(),
        })
        .eq("id", job.id);
      if (failureUpdateError) {
        console.error(`Failed to persist notification job ${job.id} failure`, failureUpdateError);
      }
      failed += 1;
    }
  }

  return NextResponse.json({ claimed: jobs.length, completed, deferred, failed });
}
