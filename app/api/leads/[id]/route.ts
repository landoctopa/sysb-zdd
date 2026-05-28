// app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // 1. Establish tenant isolation security boundaries
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Map properties matching your updated hybrid schema columns
    const updatePayload: Record<string, any> = {};

    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.website !== undefined) updatePayload.website = body.website?.trim() || null;
    if (body.industry !== undefined) updatePayload.industry = body.industry;
    if (body.linkedin_url !== undefined) updatePayload.linkedin_url = body.linkedin_url?.trim() || null;
    if (body.company_details !== undefined) updatePayload.company_details = body.company_details;
    if (body.ai_coach_state !== undefined) updatePayload.ai_coach_state = body.ai_coach_state;

    // 3. Execute modification logic against the target workspace lead row
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id) // Security barrier check ensuring users can only edit their own assigned accounts
      .select('*')
      .single();

    if (error) {
      console.error('[API Leads PATCH Error]:', error.message);
      throw error;
    }

    return NextResponse.json(updatedLead);
  } catch (err: any) {
    console.error('[API Leads PATCH Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update company lead properties' }, 
      { status: 500 }
    );
  }
}