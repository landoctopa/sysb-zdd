// app/api/iris/tasks/approve/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(req: Request) {
  try {
  const { taskId } = await req.json(); // taskId maps to actionId index UUID
  const supabase = await createClient();

  const { data: action, error } = await supabase
    .from('actions')
    .select('metadata')
    .eq('id', taskId)
    .single();

  if (error || !action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  const updatedMeta = { ...((action.metadata as Record<string, any>) || {}), user_approved: true };

  const { data: updated, error: patchError } = await supabase
    .from('actions')
    .update({ metadata: updatedMeta })
    .eq('id', taskId)
    .select('*')
    .single();

  if (patchError) throw patchError;
  return NextResponse.json(updated);
} catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}