// app/api/iris/tasks/complete/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(req: Request) {
  try {
  const { taskId, metadata } = await req.json();
  const supabase = await createClient();

  const updatePayload: Record<string, any> = {
    status: 'completed',
    completed_at: new Date().toISOString()
  };

  if (metadata) {
    updatePayload.metadata = metadata;
  }

  const { data: updated, error } = await supabase
    .from('actions')
    .update(updatePayload)
    .eq('id', taskId)
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json({ ok: true, data: updated });
} catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}