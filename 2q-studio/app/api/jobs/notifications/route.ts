import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending notification jobs' });
    }

    let processedCount = 0;

    for (const job of pendingJobs) {
      try {
        // Mock processing logic: Web Push sending logic goes here
        console.log(`Processing notification job ${job.id}`);
        await new Promise(r => setTimeout(r, 100));

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
            error_message: errorMessage
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
