// app/api/signals/action/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { EVENT_CATEGORY_LABELS } from '@/utils/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { signalId, action } = await req.json();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Resolve the user_signal row (must exist)
    let userSignal: any = null;

    // Try by user_signal id first
    const { data: byId } = await supabase
      .from('user_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (byId) {
      userSignal = byId;
    } else {
      // It might be a raw_signal id – find the user_signal by raw_signal_id
      const { data: raw } = await supabase
        .from('raw_signals')
        .select('id')
        .eq('id', signalId)
        .single();

      if (raw) {
        const { data: byRawId } = await supabase
          .from('user_signals')
          .select('*')
          .eq('user_id', user.id)
          .eq('raw_signal_id', raw.id)
          .single();

        if (byRawId) {
          userSignal = byRawId;
        }
      }
    }

    if (!userSignal) {
      return NextResponse.json({ error: 'Signal not found or dossier not generated yet' }, { status: 404 });
    }

    if (action === 'promote') {
      const dossier = userSignal.ai_dossier || {};
      const eventLabel = EVENT_CATEGORY_LABELS[userSignal.event_category] || userSignal.event_category;

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          user_signal_id: userSignal.id,
          signal_id: userSignal.raw_signal_id,
          company_name: userSignal.company_name,
          title: userSignal.title,
          country: userSignal.country,
          lead_category: userSignal.event_category,
          hotness_score: dossier.hotness_score || userSignal.match_score || 0,
          strategic_analysis: dossier.strategic_analysis || null,
          trigger_alignment: dossier.trigger_alignment || null,
          strategic_hurdles: dossier.hurdles || null,
          business_justification: dossier.business_justification || null,
          deal_timeline: dossier.estimated_sales_cycle || null,
          status: 'new',
        })
        .select()
        .single();

      if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

      await supabase.from('ai_coach_logs').insert({
        lead_id: lead.id,
        stage: 'outreach',
        insight: `Analyst Insight: This lead has been qualified based on the ${eventLabel} event. Strategy: Leverage the "${dossier.business_justification}" logic for initial outreach.`,
        context_data: {
          hotness_score: dossier.hotness_score,
          primary_hurdle: dossier.hurdles,
        },
      });

      await supabase
        .from('user_signals')
        .update({ status: 'promoted' })
        .eq('id', userSignal.id);

    } else if (action === 'dismiss') {
      await supabase
        .from('user_signals')
        .update({ status: 'dismissed' })
        .eq('id', userSignal.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Action API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process action' }, { status: 500 });
  }
}