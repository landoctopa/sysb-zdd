// app/api/leads/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateLeadStatus } from '@/app/actions/leads'; // Reuse action to fire Iris playbook entry

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Enforce tenant protection safety check before execution
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Invokes your server action which updates DB and generates stage entry alerts
    const result = await updateLeadStatus({ leadId: id, status });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[api/leads/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}