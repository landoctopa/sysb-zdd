// app/api/signals/action/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { signalId, action } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get the user_signal
    const { data: userSignal, error: fetchError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (fetchError || !userSignal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (action === 'promote') {
      const dossier = userSignal.ai_dossier || {};

      // 2. Insert lead (minimal fields – add more later)
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          user_signal_id: userSignal.id,
          signal_id: userSignal.raw_signal_id,
          company_name: userSignal.company_name,
          title: userSignal.title,
          country: userSignal.country,
          hotness_score: dossier.hotness_score || userSignal.match_score || 0,
          status: 'new',
        })
        .select()
        .single();

      if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

      // 3. Add initial coach log
      await supabase.from('ai_coach_logs').insert({
        lead_id: lead.id,
        stage: 'new',
        insight: `Lead promoted from signal: ${userSignal.title}`,
        action_type: 'none',
      });

      // 4. Mark signal as promoted
      await supabase
        .from('user_signals')
        .update({ status: 'promoted' })
        .eq('id', userSignal.id);

      // 5. Return leadId for client redirect
      return NextResponse.json({ success: true, leadId: lead.id });

    } else if (action === 'dismiss') {
      await supabase
        .from('user_signals')
        .update({ status: 'dismissed' })
        .eq('id', userSignal.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Action API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}