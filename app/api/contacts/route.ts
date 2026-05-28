// app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * FETCH METHOD: Pulls down contact rosters matching a target lead
 * Endpoint example: /api/contacts?lead_id=your-uuid-string
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Establish tenant isolation security rules
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required lead_id query parameter' }, { status: 400 });
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(contacts);
  } catch (err: any) {
    console.error('[api/contacts GET] Query error:', err);
    return NextResponse.json({ error: 'Failed to retrieve company contacts roster' }, { status: 500 });
  }
}

/**
 * SAVE METHOD: Creates a rich contact profile card linked to an account
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    
    // Establish tenant isolation security rules
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate basic identity parameters
    if (!body.lead_id || !body.name?.trim()) {
      return NextResponse.json({ error: 'Lead ID and Name are required fields' }, { status: 400 });
    }

    const cleanName = body.name.trim();
    const cleanRole = body.role?.trim() || null;
    const cleanEmail = body.email?.trim() || null;
    const cleanPhone = body.phone?.trim() || null;
    const cleanLinkedin = body.linkedin_url?.trim() || null;
    const currentStatus = body.status || 'discovered';
    const incomingMetadata = body.metadata || {};
    
    // 🛠️ FIX: Removed automatic string checking. 
    // Now reads explicitly from the client payload toggle or AI recommendation engine.
    const isDecisionMaker = typeof body.is_decision_maker === 'boolean' ? body.is_decision_maker : null;

    // Persist the complete relationship asset back to Supabase
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        lead_id: body.lead_id,
        name: cleanName,
        role: cleanRole,
        email: cleanEmail,
        phone: cleanPhone,
        linkedin_url: cleanLinkedin,
        status: currentStatus,
        metadata: incomingMetadata,
        is_decision_maker: isDecisionMaker, // Handled with zero hardcoded assumptions
        notes: body.notes?.trim() || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[api/contacts POST] Insertion failure:', insertError.message);
      throw insertError;
    }

    return NextResponse.json(newContact);
  } catch (err: any) {
    console.error('[api/contacts POST] Server Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing contact creation' }, 
      { status: 500 }
    );
  }
}