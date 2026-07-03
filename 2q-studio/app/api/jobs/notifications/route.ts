import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  // Allow manual testing without auth header locally if needed, but in prod require it.
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("Missing VAPID keys. Web push will not work.");
    return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('*, notifications(*)')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending notification jobs' });
    }

    let processedCount = 0;

    for (const job of pendingJobs) {
      try {
        console.log(`Processing notification job ${job.id}`);
        const notification = job.notifications;

        // Fetch recipients
        const { data: recipients, error: recipientsError } = await supabase
          .from('notification_recipients')
          .select('user_id')
          .eq('notification_id', notification.id);

        if (recipientsError) throw recipientsError;

        if (recipients && recipients.length > 0) {
          const userIds = recipients.map(r => r.user_id);

          // Fetch push subscriptions for all recipients
          const { data: subscriptions, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('user_id', userIds);

          if (subsError) throw subsError;

          if (subscriptions && subscriptions.length > 0) {
            const pushPayload = JSON.stringify({
              title: notification.title,
              body: notification.body,
              data: notification.data || {},
              icon: '/favicon.ico'
            });

            // Send push to all subscriptions
            const pushPromises = subscriptions.map(async (sub) => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth_key
                }
              };
              
              try {
                await webpush.sendNotification(pushSubscription, pushPayload);
                return { status: 'success', subId: sub.id };
              } catch (e: any) {
                // If subscription is gone or invalid (e.g. 410 Gone)
                if (e.statusCode === 410 || e.statusCode === 404) {
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                return { status: 'error', error: e };
              }
            });

            await Promise.allSettled(pushPromises);
          }
        }

        await supabase
          .from('notification_outbox')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        processedCount++;
      } catch (jobError: unknown) {
        const nextAttempts = job.attempts + 1;
        const newStatus = nextAttempts >= 3 ? 'failed' : 'pending';
        const errorMessage = jobError instanceof Error ? jobError.message : 'Unknown error';
        
        await supabase
          .from('notification_outbox')
          .update({
            attempts: nextAttempts,
            status: newStatus,
            last_error: errorMessage
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({ 
      message: 'Notification jobs processed', 
      processed: processedCount 
    });

  } catch (err: unknown) {
    console.error('Notification cron job error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
