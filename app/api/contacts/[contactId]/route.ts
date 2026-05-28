// app/api/contacts/[contactId]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const supabase = await createClient();
    const { contactId } = await params;
    const body = await request.json();

    // 1. Establish tenant isolation security boundaries
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Destructure properties cleanly to ensure strict type compatibility
    const updatePayload: Record<string, any> = {};

    if (body.name !== undefined) updatePayload.name = body.name.trim();
    if (body.role !== undefined) updatePayload.role = body.role?.trim() || null;
    if (body.email !== undefined) updatePayload.email = body.email?.trim() || null;
    if (body.phone !== undefined) updatePayload.phone = body.phone?.trim() || null;
    if (body.linkedin_url !== undefined) updatePayload.linkedin_url = body.linkedin_url?.trim() || null;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.metadata !== undefined) updatePayload.metadata = body.metadata;
    if (body.notes !== undefined) updatePayload.notes = body.notes?.trim() || null;
    
    // Explicitly check for boolean values—letting AI or the user drive the parameter
    if (typeof body.is_decision_maker === 'boolean' || body.is_decision_maker === null) {
      updatePayload.is_decision_maker = body.is_decision_maker;
    }

    // 3. Persist modifications cleanly directly back to Postgres
    const { data: updatedContact, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', contactId)
      .select('*')
      .single();

    if (error) {
      console.error('[API Contacts PATCH Error]:', error.message);
      throw error;
    }

    return NextResponse.json(updatedContact);
  } catch (err: any) {
    console.error('[API Contacts PATCH Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update contact records' }, 
      { status: 500 }
    );
  }
}