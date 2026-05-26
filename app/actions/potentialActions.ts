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

    // 2. Fetch raw signal data to preserve immutable trigger context
    const { data: rawSignal, error: rawError } = await supabase
      .from('raw_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (rawError || !rawSignal) throw new Error('Source market signal no longer exists.');

    const dossier = virtualState.ai_dossier;

    // 3. Create the row directly inside the central leads ledger
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        raw_signal_id: signalId,
        company_name: rawSignal.company_name || 'Unknown Company',
        status: 'potential', // Initializes our stage taxonomy tracker
        hotness_score: dossier.hotness_score || 0,
        
        // Deep-freeze the contextual research and triage checks
        ai_coach_state: {
          ai_dossier: dossier,
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
      })
      .select()
      .single();

    if (leadError) throw new Error(`Lead instantiation rejected: ${leadError.message}`);

    // 4. Seed the polymorphic actions ledger with required fields matching your fresh Postgres constraints
    const { error: actionsError } = await supabase
      .from('actions')
      .insert([
        {
          lead_id: lead.id,
          stage: 'potential',             // Explicitly passes your lead_status enum rule
          type: 'notification',           // Polymorphic type
          channel: 'iris',                // Driven by Iris
          status: 'completed',            // Instantly marked as historical timeline item
          title: 'Iris Fit Justification briefing',
          body: dossier.business_justification || 'No justification provided.',
          due_date: new Date().toISOString(),
          required: false
        },
        {
          lead_id: lead.id,
          stage: 'potential',
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

    // 5. Invalidate layout caches to force instant DOM updates
    revalidatePath('/signals');
    revalidatePath('/leads');

    // Return the fresh ID reference back to the client router loop
    return { leadId: lead.id };

  } catch (err: any) {
    console.error('[promotePotential Exception Boundary]:', err);
    throw new Error(err.message || 'Database transaction runtime failure.');
  }
}

/**
 * Commits a signal ID to the suppression table to remove it from the user's feed
 * without polluting the core leads metrics portfolio.
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
      // If it's a duplicate insertion error, fail gracefully since it's already dismissed
      if (error.code !== '23505') throw error;
    }

    // Refresh layout view boundaries
    revalidatePath('/signals');
    return { success: true };

  } catch (err) {
    console.error('[dismissSignal Exception Handler]:', err);
    throw err;
  }
}