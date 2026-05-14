import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();
  const supabase = await createClient();

  // Validate status against allowed values (optional but good)
  const allowedStatuses = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    // 1. Update the lead status
    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Generate stage-specific coach insight (optional but helpful)
    let coachInsight = '';
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
      case 'lost':
        coachInsight = `Lead lost. Consider analyzing why and whether to keep it for future nurturing.`;
        break;
      default:
        coachInsight = `Lead moved to ${status}. Update your stakeholders and ensure the next follow-up task is set.`;
    }

    // Insert a coach log (non-blocking, but we await for simplicity)
    await supabase.from('ai_coach_logs').insert({
      lead_id: id,
      stage: status,
      insight: coachInsight,
      action_type: 'none',
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}