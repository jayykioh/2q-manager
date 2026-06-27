import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      } catch (jobError: any) {
        const nextAttempts = job.attempts + 1;
        const newStatus = nextAttempts >= 3 ? 'failed' : 'pending';
        
        await supabase
          .from('notification_outbox')
          .update({
            attempts: nextAttempts,
            status: newStatus,
            error_message: jobError.message
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({ 
      message: 'Notification jobs processed', 
      processed: processedCount 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
