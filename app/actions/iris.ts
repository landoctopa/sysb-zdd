'use server';

/**
 * /app/actions/iris.ts
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Persist AI-Generated drafts contextually inside the lead's state vault.
 */
export async function saveIrisDraft({
  leadId,
  actionKey,
  payload,
}: {
  leadId: string;
  actionKey: string;
  payload: any;
}) {
  const supabase = await createClient();
  
  // Fetch existing state
  const { data: lead } = await supabase
    .from('leads')
    .select('ai_coach_state')
    .eq('id', leadId)
    .single();
    
  if (!lead) throw new Error('Target lead record missing');

  const state = (lead.ai_coach_state as Record<string, any>) || {};
  if (!state.ai_drafts) state.ai_drafts = {};
  
  // Cache the fresh generation draft directly into the JSONB object
  state.ai_drafts[actionKey] = payload;

  const { error } = await supabase
    .from('leads')
    .update({ ai_coach_state: state })
    .eq('id', leadId);

  if (error) throw new Error(`Draft persistence failed: ${error.message}`);

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}