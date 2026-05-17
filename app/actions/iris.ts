'use server';

/**
 * /app/actions/iris.ts
 *
 * Next.js server actions that bridge React components to IrisOrchestrator.
 * All business logic stays in the orchestrator – these are thin I/O handlers.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { IrisOrchestrator } from '@/lib/iris/orchestrator';
import { evaluateExitCriteria } from '@/lib/iris/condition-evaluator';
import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';
import type { LeadStage, Task, CoachState } from '@/lib/iris/types';
import type { CriterionResult } from '@/lib/iris/condition-evaluator';

// ─── submitTaskFeedback ───────────────────────────────────────────────────────

/**
 * Called by IrisFeedbackPrompt after the user answers all questions.
 * Merges answers into ai_coach_state, fires any post_feedback_action,
 * and marks the task feedback as submitted.
 */
export async function submitTaskFeedback({
  leadId,
  taskConfigId,
  answers,
  savesTo,
}: {
  leadId: string;
  taskConfigId: string;
  answers: Record<string, string | string[]>;
  savesTo: string;
}) {
  const supabase = await createClient();

  // Get current lead with coach state
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, contacts(*)')
    .eq('id', leadId)
    .single();

  if (error || !lead) throw new Error('Lead not found');

  const coachState = (lead.ai_coach_state as CoachState) || {};

  const orchestrator = new IrisOrchestrator(lead, coachState);
  const postFeedbackResult = await orchestrator.onFeedbackSubmit(taskConfigId, answers);

  // Update the task: mark feedback as submitted and store answers
  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      feedback_submitted: true,
      feedback_answers: answers,
      feedback_saves_to: savesTo,
    })
    .eq('lead_id', leadId)
    .eq('task_config_id', taskConfigId);

  if (taskError) throw new Error(`Failed to update task: ${taskError.message}`);

  // Also update the lead's ai_coach_state with the merged answers
  // The orchestrator already computed the updated state in onFeedbackSubmit
  // We need to persist it. However, the orchestrator's mergeIntoCoachState is private.
  // We'll re-merge manually here using the same logic.
  const updatedCoachState = mergeIntoCoachState(coachState, savesTo, answers);
  await supabase
    .from('leads')
    .update({ ai_coach_state: updatedCoachState })
    .eq('id', leadId);

  // If post-feedback action produced a result (e.g., objection playbook), log it
  if (postFeedbackResult) {
    await supabase.from('ai_coach_logs').insert({
      lead_id: leadId,
      stage: lead.status,
      type: 'post_feedback',
      message: postFeedbackResult.message ?? null,
      suggested_actions: postFeedbackResult.suggested_actions ?? [],
      metadata: postFeedbackResult,
    });
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true, postFeedbackResult };
}

// ─── triggerStageEntry ───────────────────────────────────────────────────────

/**
 * Called after updateLeadStatus succeeds.
 * Fires the IrisOrchestrator.onStageEntry() to generate the entry briefing
 * and suggested tasks. Returns the message and tasks for the UI to show.
 */
export async function triggerStageEntry({
  leadId,
  stage,
}: {
  leadId: string;
  stage: LeadStage;
}) {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, contacts(*)')
    .eq('id', leadId)
    .single();

  if (!lead) throw new Error('Lead not found');

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const orchestrator = new IrisOrchestrator(lead, coachState);

  const stageEntry = await orchestrator.onStageEntry(stage);
  if (!stageEntry) return { message: null, taskCount: 0 };

  const { message, tasks: suggestedTasks } = stageEntry;

  // Log the entry message
  await supabase.from('ai_coach_logs').insert({
    lead_id: leadId,
    stage,
    type: 'entry',
    message,
    suggested_tasks: suggestedTasks,
  });

  // Return the suggested tasks – the UI will ask user to confirm creation
  return { message, suggestedTasks };
}

// ─── confirmAndCreateTasks ───────────────────────────────────────────────────

/**
 * After user confirms one or more suggested tasks, create them in the database.
 */
export async function confirmAndCreateTasks({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: Partial<Task>[];
}) {
  const supabase = await createClient();

  const tasksToInsert = tasks.map(task => ({
    ...task,
    status: 'pending',
    feedback_submitted: false,
    user_approved: false,
  }));

  const { error } = await supabase.from('tasks').insert(tasksToInsert);
  if (error) throw new Error(`Failed to create tasks: ${error.message}`);

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

// ─── completeTask ────────────────────────────────────────────────────────────

/**
 * Called when user clicks "Complete" on a task.
 * Checks the completion gate first – returns an error message if blocked.
 * If allowed, marks task as completed and unlocks any dependent tasks.
 */
export async function completeTask({
  leadId,
  taskId,
  taskConfigId,
}: {
  leadId: string;
  taskId: string;
  taskConfigId: string;
}) {
  const supabase = await createClient();

  // Fetch the task row and lead
  const { data: task, error: taskFetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskFetchError || !task) throw new Error('Task not found');

  const { data: lead } = await supabase
    .from('leads')
    .select('*, ai_coach_state')
    .eq('id', leadId)
    .single();

  if (!lead) throw new Error('Lead not found');

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const orchestrator = new IrisOrchestrator(lead, coachState);

  const gate = orchestrator.canCompleteTask(taskConfigId, task);
  if (!gate.allowed) {
    return { ok: false, message: gate.message };
  }

  // Mark task as completed
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (updateError) throw new Error(`Failed to complete task: ${updateError.message}`);

  // Unlock dependent tasks: find tasks in the same stage that depend on this task_config_id
  const stage = lead.status as LeadStage;
  const stageConfig = IRIS_PLAYBOOK[stage];
  const dependents = stageConfig?.tasks.filter(t => t.depends_on?.includes(taskConfigId)) ?? [];

  if (dependents.length > 0) {
    const newTasks = dependents.map(t => ({
      lead_id: leadId,
      stage,
      task_config_id: t.id,
      title: t.title,
      channel: t.channel,
      due_date: addBusinessDays(new Date(), t.due_business_days).toISOString(),
      required: t.required,
      iris_tip: t.iris_tip ?? null,
      status: 'pending',
      feedback_submitted: false,
      user_approved: false,
    }));

    const { error: insertError } = await supabase.from('tasks').insert(newTasks);
    if (!insertError) {
      // Log that Iris unlocked new tasks
      await supabase.from('ai_coach_logs').insert({
        lead_id: leadId,
        stage,
        type: 'task_unlocked',
        message: `Task complete. I've created ${newTasks.length} follow-up ${newTasks.length === 1 ? 'task' : 'tasks'} for you.`,
        suggested_tasks: newTasks,
      });
    }
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

// ─── getExitCriteriaResults ──────────────────────────────────────────────────

/**
 * Called by StageAdvanceGate before opening the dialog.
 * Evaluates all exit criteria for the current stage server-side.
 */
export async function getExitCriteriaResults({
  leadId,
  currentStage,
}: {
  leadId: string;
  currentStage: LeadStage;
}): Promise<{ criteriaResults: CriterionResult[]; blockedMessage?: string }> {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, contacts(*)')
    .eq('id', leadId)
    .single();

  if (!lead) return { criteriaResults: [], blockedMessage: undefined };

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const context = { lead, coach_state: coachState };
  const stageConfig = IRIS_PLAYBOOK[currentStage];
  if (!stageConfig) return { criteriaResults: [], blockedMessage: undefined };

  const criteriaResults = evaluateExitCriteria(stageConfig.exit_criteria ?? [], context);
  const allPassed = criteriaResults.every(c => c.passed);

  return {
    criteriaResults,
    blockedMessage: allPassed ? undefined : stageConfig.exit_blocked_message,
  };
}

// ─── approveTask ─────────────────────────────────────────────────────────────

/**
 * Marks an Iris-generated draft (proposal, deal summary, etc.) as user-approved.
 * Unlocks task completion if the task has requires_user_approval.
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

// ─── Helpers (duplicated from orchestrator to avoid circular deps) ──────────

function mergeIntoCoachState(
  currentState: CoachState,
  path: string,
  answers: Record<string, any>
): CoachState {
  const parts = path.split('.');
  const newState = JSON.parse(JSON.stringify(currentState));
  let target = newState;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!target[part]) target[part] = {};
    target = target[part];
  }
  const lastPart = parts[parts.length - 1];
  target[lastPart] = { ...target[lastPart], ...answers };
  return newState;
}

function addBusinessDays(date: Date, days: number): Date {
  if (days <= 0) return new Date(date);
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}