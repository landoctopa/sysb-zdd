// app/api/iris/feedback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
  const { leadId, answers } = await req.json();
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('ai_coach_state')
    .eq('id', leadId)
    .single();

  const currentState = ((lead?.ai_coach_state as Record<string, any>) || {});
  const updatedState = {
    ...currentState,
    answers: { ...(currentState.answers || {}), ...answers }
  };

  const { error } = await supabase
    .from('leads')
    .update({ ai_coach_state: updatedState })
    .eq('id', leadId);

  if (error) throw error;
  return NextResponse.json({ ok: true });
} catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}