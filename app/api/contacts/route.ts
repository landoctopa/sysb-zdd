// app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Establish tenant-isolated Supabase client context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate essential payload constraints
    if (!body.lead_id || !body.name?.trim()) {
      return NextResponse.json({ error: 'Lead ID and Name are required fields' }, { status: 400 });
    }

    // 3. Smart Field Mapping to align form values with exact database schema columns
    const titleText = body.title?.trim() || null;
    const labelText = body.label?.trim() || '';
    
    // Evaluate if the entered label string explicitly implies a decision-making persona
    const isDecisionMaker = 
      labelText.toLowerCase().includes('decision') || 
      labelText.toLowerCase().includes('maker') || 
      titleText?.toLowerCase().includes('ceo') || 
      titleText?.toLowerCase().includes('cto') || 
      titleText?.toLowerCase().includes('founder');

    // 4. Persist the record directly to the 'contacts' table
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        lead_id: body.lead_id,
        name: body.name.trim(),
        role: titleText, // Maps form 'title' input to 'role' column
        email: body.email?.trim() || null,
        linkedin_url: body.linkedin_url?.trim() || null,
        is_decision_maker: isDecisionMaker, // Maps form 'label' or title clues to 'is_decision_maker' boolean
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[api/contacts] Insertion failed:', insertError.message);
      throw insertError;
    }

    // 5. Return the native database row back to the client component
    return NextResponse.json(newContact);
  } catch (err: any) {
    console.error('[api/contacts] Server Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing contact creation' }, 
      { status: 500 }
    );
  }
}