// app/api/iris/tasks/confirm/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
  const { tasks } = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('actions')
    .insert(tasks)
    .select('*');

  if (error) throw error;
  return NextResponse.json(data);
} catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}