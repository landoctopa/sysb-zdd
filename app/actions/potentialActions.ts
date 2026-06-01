// app/actions/potentialActions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { VirtualSignalState } from '@/types/signals';

/**
 * Promotes a stateless browser-triaged signal directly into the core Leads ledger
 * and seeds the unified actions timeline with Iris's pre-generated strategic analysis.
 */
export async function promotePotential(signalId: string, virtualState: VirtualSignalState) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user session context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Fetch raw signal data
    const { data: rawSignal, error: rawError } = await supabase
      .from('raw_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (rawError || !rawSignal) throw new Error('Source market signal no longer exists.');

    const dossier = virtualState.ai_dossier;

    // PRESERVE ORIGINAL SIGNAL CONTEXT: Format a structured metadata entry payload
    const originalSignalContext = {
      id: rawSignal.id,
      title: rawSignal.title || 'Untitled Signal',
      description: rawSignal.description || '',
      signal_type: rawSignal.signal_type || 'Company News',
      published_at: rawSignal.published_at || new Date().toISOString(),
      company_name: rawSignal.company_name || 'Unknown Company',
      captured_at: new Date().toISOString()
    };

    // 3. Create the row directly inside the central leads ledger
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        raw_signal_id: signalId,
        company_name: rawSignal.company_name || 'Unknown Company',
        status: 'discovery',
        hotness_score: dossier.hotness_score || 0,
        
        // Deep-freeze contextual research, triage check histories, and the lead signals feed
        ai_coach_state: {
          ai_dossier: dossier,
          lead_signals: [originalSignalContext], // Lead Listening historical tracking engine initiated
          stage_history: {
            signal: {
              completed_at: new Date().toISOString(),
              assessment: virtualState.tasks.assess_signal_relevance.answers,
              extracted_contacts: virtualState.tasks.extract_potential_contacts.answers
            }
          }
        },
        
        // Map data properties directly to columns
        strategic_analysis: dossier.strategic_analysis || null,
        trigger_alignment: dossier.trigger_alignment || null,
        strategic_hurdles: dossier.hurdles || null,
        business_justification: dossier.business_justification || null,
        deal_timeline: dossier.estimated_sales_cycle || null,
        company_details: {}
      })
      .select()
      .single();

    if (leadError) throw new Error(`Lead instantiation rejected: ${leadError.message}`);

    // 4. Seed the polymorphic actions ledger with required fields
    const { error: actionsError } = await supabase
      .from('actions')
      .insert([
        {
          lead_id: lead.id,
          stage: 'discovery',
          type: 'notification',
          channel: 'iris',
          status: 'completed',
          title: 'Iris Fit Justification briefing',
          body: dossier.business_justification || 'No justification provided.',
          due_date: new Date().toISOString(),
          required: false
        },
        {
          lead_id: lead.id,
          stage: 'discovery',
          type: 'notification',
          channel: 'iris',
          status: 'completed',
          title: 'Iris Threat & Hurdle evaluation',
          body: dossier.hurdles || 'No immediate structural hurdles identified.',
          due_date: new Date().toISOString(),
          required: false
        }
      ]);

    if (actionsError) {
      console.error('[Warning]: Unified action log seeding dropped:', actionsError.message);
    }

    revalidatePath('/signals');
    revalidatePath('/leads');

    return { leadId: lead.id };

  } catch (err: any) {
    console.error('[promotePotential Exception Boundary]:', err);
    throw new Error(err.message || 'Database transaction runtime failure.');
  }
}

/**
 * Commits a signal ID to the suppression table to remove it from the user's feed
 */
export async function dismissSignal(signalId: string) {
  try {
    const supabase = await createClient();

    // Authenticate user session context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Write to the suppression ledger index
    const { error } = await supabase
      .from('dismissed_signals')
      .insert({
        user_id: user.id,
        raw_signal_id: signalId
      });

    if (error) {
      if (error.code !== '23505') throw error;
    }

    revalidatePath('/signals');
    return { success: true };

  } catch (err) {
    console.error('[dismissSignal Exception Handler]:', err);
    throw err;
  }
}


export async function createManualPotential(formData: {
  title: string;
  company_name: string;
  sectors: string[];
  event_category: string;
  link: string;
  description: string;
  country: string;
}) {
  const { redirect } = await import('next/navigation');
  let newLeadId: string | null = null;

  try {
    const supabase = await createClient();

    // 1. Authenticate user context session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Generate a baseline fallback strategic summary analysis for user-entered fields
    const defaultJustification = formData.description.trim() || `Manually logged catalyst: ${formData.title}`;

    // 3. Insert directly into the central leads ledger table matching your schema columns
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        company_name: formData.company_name.trim() || 'Unknown Company',
        status: 'discovery',
        hotness_score: 50, // Standard neutral fallback indicator score for manual items
        website: formData.link.trim() || null,
        industry: formData.sectors[0] || null,
        country: formData.country || 'India',
        
        // Deep-freeze contextual fields cleanly inside JSONB atom arrays
        ai_coach_state: {
          ai_dossier: {
            strategic_analysis: defaultJustification,
            trigger_alignment: `Manual Entry Category: ${formData.event_category}`,
            business_justification: defaultJustification,
            hurdles: 'No baseline hazards logged.',
            estimated_sales_cycle: '30 days'
          },
          lead_signals: [{
            id: crypto.randomUUID(),
            title: formData.title,
            description: formData.description,
            signal_type: 'Expression of Interest',
            published_at: new Date().toISOString(),
            company_name: formData.company_name,
            captured_at: new Date().toISOString()
          }],
          stage_history: {
            manual: {
              completed_at: new Date().toISOString()
            }
          }
        },
        strategic_analysis: defaultJustification,
        trigger_alignment: `Manual entry: ${formData.event_category}`,
        business_justification: defaultJustification,
        company_details: {}
      })
      .select()
      .single();

    if (leadError) throw new Error(`Manual entry rejected by database: ${leadError.message}`);
    newLeadId = lead.id;

    // 4. Seed the polymorphic actions history timeline mapping directly to columns
    const { error: actionsError } = await supabase
      .from('actions')
      .insert([
        {
          lead_id: lead.id,
          stage: 'discovery',
          type: 'notification',
          channel: 'internal',
          status: 'completed',
          title: `Manual Catalyst Logged: ${formData.title}`,
          body: formData.description || 'No description provided.',
          due_date: new Date().toISOString(),
          required: false
        }
      ]);

    if (actionsError) {
      console.error('[Warning]: Failed to seed manual notification ledger item:', actionsError.message);
    }

    revalidatePath('/leads');
    revalidatePath('/potentials');

  } catch (err: any) {
    console.error('[createManualPotential Exception Boundary]:', err);
    throw new Error(err.message || 'Transaction runtime failure.');
  }

  // Next.js redirection execution safely placed outside the main try-catch ecosystem block
  if (newLeadId) {
    redirect(`/leads/${newLeadId}`);
  }
}