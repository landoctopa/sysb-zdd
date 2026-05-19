// app/api/leads/[id]/tasks/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskData = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        lead_id: id,
        status: 'pending',
        feedback_submitted: false,
        user_approved: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newTask);
  } catch (err: any) {
    console.error('[api/leads/tasks]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}