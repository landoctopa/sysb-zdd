// app/api/signals/action/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { EVENT_CATEGORY_LABELS } from '@/utils/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { signalId, action } = await req.json();

  // 1. Auth & Identity
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("Authenticated user:", user);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 2. Fetch the Signal and its AI research (the dossier)
    const { data: signal, error: signalError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (action === 'promote') {
      const dossier = signal.ai_dossier || {};

    // ✅ Get a readable label for the event category
    const eventLabel = EVENT_CATEGORY_LABELS[signal.event_category] || signal.event_category;

    // STEP A: Create the Lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        // ... all the lead fields remain identical ...
        user_id: user.id, 
        user_signal_id: signal.id,
        signal_id: signal.raw_signal_id,
        company_name: signal.company_name,
        title: signal.title,
        country: signal.country,
        lead_category: signal.event_category,       // keep canonical value in DB
        hotness_score: dossier.hotness_score || signal.match_score,
        strategic_analysis: dossier.strategic_analysis,
        trigger_alignment: dossier.trigger_alignment,
        strategic_hurdles: dossier.hurdles,
        business_justification: dossier.business_justification,
        deal_timeline: dossier.estimated_sales_cycle,
        status: 'new'
      })
      .select()
      .single();

    if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

    // STEP B: Initialize AI Coach log with the readable event label
    await supabase.from('ai_coach_logs').insert({
      lead_id: lead.id,
      stage: 'outreach',
      insight: `Analyst Insight: This lead has been qualified based on the ${eventLabel} event. Strategy: Leverage the "${dossier.business_justification}" logic for initial outreach.`,
      context_data: { 
        hotness_score: dossier.hotness_score,
        primary_hurdle: dossier.hurdles 
      }
    });

      // STEP C: Clear the Inbox
      await supabase
        .from('user_signals')
        .update({ status: 'promoted' })
        .eq('id', signalId);

    } else if (action === 'dismiss') {
      // Archive the signal so it doesn't clutter the firehose
      await supabase
        .from('user_signals')
        .update({ status: 'dismissed' })
        .eq('id', signalId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Action API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process action" }, { status: 500 });
  }
}