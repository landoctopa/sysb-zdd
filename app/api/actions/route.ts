// app/api/actions/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * FETCH METHOD: Pulls down history log items matching target filters
 * Endpoint format example: /api/actions?lead_id=123&type=note
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Unpack incoming query parameters from the request URL string
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const actionType = searchParams.get('type');   // optional: 'task', 'note', 'notification'
    const dealStage = searchParams.get('stage');   // optional: 'discovery', 'engaged', etc.
    const status = searchParams.get('status');     // optional: 'pending', 'completed'

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required lead_id parameter' }, { status: 400 });
    }

    // 2. Build out the query dynamically against your unified actions ledger
    let query = supabase
      .from('actions')
      .select('*')
      .eq('lead_id', leadId);

    // Apply optional granular filters if the client requested them
    if (actionType) query = query.eq('type', actionType);
    if (dealStage)  query = query.eq('stage', dealStage);
    if (status)     query = query.eq('status', status);

    // Always sort by newest first to maintain a clean chronological audit trail
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API Actions GET Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch history logs' }, { status: 500 });
  }
}

/**
 * SAVE METHOD: Handles creating new rows (like logging a text note or task array)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const payload = await request.json();
    const isBulk = Array.isArray(payload);

    const { data, error } = await supabase
      .from('actions')
      .insert(isBulk ? payload : [payload])
      .select('*');

    if (error) throw error;
    return NextResponse.json(isBulk ? data : data[0]);
  } catch (err: any) {
    console.error('[API Actions POST Error]:', err);
    return NextResponse.json({ error: 'Could not log history record' }, { status: 500 });
  }
}