import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  
  // Basic security check: expect `Bearer <CRON_SECRET>`
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // Note: Since we are running on service_role key, we bypass RLS.
    // 1. Find all products that are reserved and reservation has expired
    const { data: expiredProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, current_store_id')
      .eq('status', 'reserved')
      .lt('reserved_until', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredProducts || expiredProducts.length === 0) {
      return NextResponse.json({ message: 'No expired reservations found' });
    }

    const updates = [];
    const movements = [];

    for (const product of expiredProducts) {
      // Release reservation
      updates.push(
        supabase
          .from('products')
          .update({
            status: 'in_stock',
            reserved_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)
      );

      // Log movement
      movements.push({
        product_id: product.id,
        to_store_id: product.current_store_id,
        movement_type: 'return',
        reason: 'Reservation expired cleanup by Cron',
        created_by: null // System
      });
    }

    await Promise.all(updates);
    
    if (movements.length > 0) {
      await supabase.from('inventory_movements').insert(movements);
    }

    return NextResponse.json({ 
      message: 'Cleanup successful', 
      processed: expiredProducts.length 
    });

  } catch (err: unknown) {
    console.error('Cron job error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
