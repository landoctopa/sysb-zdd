// app/leads/[id]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import LeadWorkbenchClient from './LeadWorkbenchClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadWorkbenchPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Pull down the target lead file record
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (!lead) {
    notFound();
  }

  // LEAD LISTENING LOGIC: Run a background synchronization loop for matching company triggers
  if (lead.company_name) {
    const coachState = (lead.ai_coach_state as Record<string, any>) || {};
    let activeSignalsFeed = Array.isArray(coachState.lead_signals) ? coachState.lead_signals : [];

    // Search for alternative signal entries with matching corporate names in the raw database logs
    const { data: overlappingSignals } = await supabase
      .from('raw_signals')
      .select('*')
      .eq('company_name', lead.company_name);

    if (overlappingSignals && overlappingSignals.length > 0) {
      let stateChanged = false;
      const trackedSignalIds = new Set(activeSignalsFeed.map((s: any) => s.id));

      for (const alert of overlappingSignals) {
        if (!trackedSignalIds.has(alert.id)) {
          activeSignalsFeed.push({
            id: alert.id,
            title: alert.title || 'Untitled Signal',
            description: alert.description || '',
            signal_type: alert.signal_type || 'Company News',
            published_at: alert.published_at || new Date().toISOString(),
            company_name: alert.company_name,
            captured_at: new Date().toISOString()
          });
          stateChanged = true;
        }
      }

      // If new background market highlights were caught, commit them directly to the lead state
      if (stateChanged) {
        const structuralUpdate = { ...coachState, lead_signals: activeSignalsFeed };
        
        await supabase
          .from('leads')
          .update({ ai_coach_state: structuralUpdate })
          .eq('id', id);

        // Sync local object reference passed to client downstream
        lead.ai_coach_state = structuralUpdate;
      }
    }
  }

  // 2. Pull down the related task records from your unified ledger
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  // 3. Pull down your newly updated contact relationship profiles
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  return (
    <LeadWorkbenchClient 
      initialLead={lead} 
      initialActions={actions || []} 
      initialContacts={contacts || []} 
    />
  );
}