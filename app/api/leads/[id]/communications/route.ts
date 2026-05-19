// app/api/leads/[id]/communications/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const commData = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: newComm, error } = await supabase
      .from('communications')
      .insert({
        ...commData,
        lead_id: id,
        occurred_at: commData.occurred_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newComm);
  } catch (err: any) {
    console.error('[api/leads/communications]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}