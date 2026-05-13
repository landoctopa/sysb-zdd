// app/api/signals/action/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { EVENT_CATEGORY_LABELS } from '@/utils/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { signalId, action } = await req.json();

  // 1. Auth & Identity
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 2. Fetch the signal – try user_signals first, then raw_signals
    let signal: any = null;
    let isUserSignal = false;

    const { data: userSignal } = await supabase
      .from('user_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (userSignal) {
      signal = userSignal;
      isUserSignal = true;
    } else {
      const { data: rawSignal } = await supabase
        .from('raw_signals')
        .select('*')
        .eq('id', signalId)
        .single();
      if (rawSignal) {
        signal = rawSignal;
      }
    }

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (action === 'promote') {
      // Use dossier from user_signal if available, else empty
      const dossier = signal.ai_dossier || {};

      // Get a readable label for the event category
      const eventLabel = EVENT_CATEGORY_LABELS[signal.event_category] || signal.event_category;

      // Determine the raw_signal_id
      const rawSignalId = isUserSignal ? signal.raw_signal_id : signal.id;

      // STEP A: Create the Lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          user_signal_id: isUserSignal ? signal.id : null, // only set if it’s a user_signal
          signal_id: rawSignalId,
          company_name: signal.company_name,
          title: signal.title,
          country: signal.country,
          lead_category: signal.event_category,
          hotness_score: dossier.hotness_score || signal.match_score || 0,
          strategic_analysis: dossier.strategic_analysis,
          trigger_alignment: dossier.trigger_alignment,
          strategic_hurdles: dossier.hurdles,
          business_justification: dossier.business_justification,
          deal_timeline: dossier.estimated_sales_cycle,
          status: 'new',
        })
        .select()
        .single();

      if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

      // STEP B: Initialize AI Coach log
      await supabase.from('ai_coach_logs').insert({
        lead_id: lead.id,
        stage: 'outreach',
        insight: `Analyst Insight: This lead has been qualified based on the ${eventLabel} event. Strategy: Leverage the "${dossier.business_justification}" logic for initial outreach.`,
        context_data: {
          hotness_score: dossier.hotness_score,
          primary_hurdle: dossier.hurdles,
        },
      });

      // STEP C: If we have a user_signal, mark it as promoted
      if (isUserSignal) {
        await supabase
          .from('user_signals')
          .update({ status: 'promoted' })
          .eq('id', signalId);
      }
    } else if (action === 'dismiss') {
      if (isUserSignal) {
        await supabase
          .from('user_signals')
          .update({ status: 'dismissed' })
          .eq('id', signalId);
      }
      // If it's a raw signal, we don't store a dismissal record yet (optional future enhancement)
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Action API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process action' },
      { status: 500 }
    );
  }
}