import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subscription, deviceName, userAgent } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Supabase admin client to bypass RLS since users might not be fully authenticated in this API context or we just want to ensure DB insert works reliably
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { keys, endpoint } = subscription;
    
    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        device_name: deviceName || 'Unknown Device',
        user_agent: userAgent || 'Unknown Browser',
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })
      .select()
      .single();

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
