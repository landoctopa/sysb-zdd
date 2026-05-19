// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const isCompleted = status === 'completed';

    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/tasks/toggle]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}