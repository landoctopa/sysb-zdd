// app/api/leads/[id]/metadata/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { answers } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch existing state to prevent destructive field overwrites
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('ai_coach_state')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const currentCoachState = (lead.ai_coach_state as Record<string, any>) || {};
    
    // Maintain identical mirroring to client-side store deep nested objects
    const updatedCoachState = {
      ...currentCoachState,
      answers: {
        ...(currentCoachState.answers || {}),
        ...answers,
      },
    };

    const { error: updateError } = await supabase
      .from('leads')
      .update({ ai_coach_state: updatedCoachState, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/leads/metadata]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}