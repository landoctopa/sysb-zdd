import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json();
  const { answers } = body;

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('ai_coach_state')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const currentState = (lead.ai_coach_state as any) || {};
  const newState = {
    ...currentState,
    answers: {
      ...(currentState.answers || {}),
      ...answers,
    },
  };

  const { error: updateError } = await supabase
    .from('leads')
    .update({ ai_coach_state: newState })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}