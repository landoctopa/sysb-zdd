// app/api/actions/[actionId]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ actionId: string }> }) {
  try {
    const supabase = await createClient();
    const { actionId } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('actions')
      .update(body)
      .eq('id', actionId)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Could not check off task item' }, { status: 500 });
  }
}