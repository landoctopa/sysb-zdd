import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();
  const supabase = await createClient();

  try {
    // 1. Update the Lead Status
    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. AI Coach Logic (The "Nudge")
    // In a real scenario, you'd trigger your LLM here. 
    // For now, we'll insert a stage-specific strategy.
    let coachInsight = "";
    switch (status) {
      case 'proposal':
        coachInsight = `The shift to Proposal is critical. Focus your pitch on the "${lead.strategic_analysis}" we identified. Remember to mitigate the hurdle: ${lead.strategic_hurdles}.`;
        break;
      case 'negotiation':
        coachInsight = `Negotiation phase. Stick to the Business Justification: "${lead.business_justification}". Don't drop price without increasing the contract timeline.`;
        break;
      case 'won':
        coachInsight = `Deal Closed! Prepare the transition to Customer status and request a testimonial based on the initial project goals.`;
        break;
      default:
        coachInsight = `Lead moved to ${status}. Update your stakeholders and ensure the next follow-up task is set.`;
    }

    await supabase.from('ai_coach_logs').insert({
      lead_id: id,
      stage: status,
      insight: coachInsight
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}