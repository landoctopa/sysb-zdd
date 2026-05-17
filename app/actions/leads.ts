'use server';

/**
 * /app/actions/leads.ts
 *
 * Lead management server actions.
 * Handles status updates with Iris integration, task approval, dismissal.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { triggerStageEntry, confirmAndCreateTasks } from './iris';
import type { LeadStage } from '@/lib/iris/types';

const VALID_STAGES: LeadStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

// ─── updateLeadStatus ─────────────────────────────────────────────────────────

/**
 * Moves a lead to a new stage.
 * After persisting, fires triggerStageEntry so Iris generates the briefing
 * and suggested tasks for the new stage.
 *
 * The UI should apply an optimistic update before calling this.
 * Returns the suggested tasks (if any) for the UI to show a confirmation dialog.
 */
export async function updateLeadStatus({
  leadId,
  status,
}: {
  leadId: string;
  status: string;
}) {
  if (!VALID_STAGES.includes(status as LeadStage)) {
    throw new Error(`Invalid stage: ${status}`);
  }

  const supabase = await createClient();

  // Update lead status
  const { error } = await supabase
    .from('leads')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) throw new Error(`Failed to update lead status: ${error.message}`);

  // Trigger Iris stage entry (runs in background, but we await to get suggested tasks)
  const { message, suggestedTasks } = await triggerStageEntry({ leadId, stage: status as LeadStage });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');

  return { ok: true, stage: status, entryMessage: message, suggestedTasks: suggestedTasks ?? [] };
}

// ─── confirmStageTasks ────────────────────────────────────────────────────────

/**
 * Called after user confirms the suggested tasks from stage entry.
 * Creates the tasks in the database.
 */
export async function confirmStageTasks({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: any[]; // Partial<Task>[]
}) {
  return confirmAndCreateTasks({ leadId, tasks });
}

// ─── approveTask ──────────────────────────────────────────────────────────────

/**
 * Marks an Iris-generated draft (proposal, deal summary, etc.) as user-approved.
 * Unlocks the task completion gate for tasks with requires_user_approval: true.
 */
export async function approveTask({
  leadId,
  taskId,
}: {
  leadId: string;
  taskId: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ user_approved: true })
    .eq('id', taskId)
    .eq('lead_id', leadId);

  if (error) throw new Error(`Failed to approve task: ${error.message}`);

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

// ─── dismissLead / markDormant ────────────────────────────────────────────────

export async function dismissLead({ leadId }: { leadId: string }) {
  const supabase = await createClient();
  await supabase.from('leads').update({ status: 'lost' }).eq('id', leadId);
  revalidatePath('/leads');
  return { ok: true };
}

export async function markLeadDormant({
  leadId,
  reengageMonths = 6,
}: {
  leadId: string;
  reengageMonths?: number;
}) {
  const supabase = await createClient();
  const reengageAt = new Date();
  reengageAt.setMonth(reengageAt.getMonth() + reengageMonths);

  // Get current ai_coach_state
  const { data: lead } = await supabase
    .from('leads')
    .select('ai_coach_state')
    .eq('id', leadId)
    .single();

  const currentState = (lead?.ai_coach_state as any) || {};
  const newState = {
    ...currentState,
    dormant: true,
    reengage_at: reengageAt.toISOString(),
  };

  await supabase
    .from('leads')
    .update({
      status: 'lost',
      ai_coach_state: newState,
    })
    .eq('id', leadId);

  revalidatePath('/leads');
  return { ok: true };
}