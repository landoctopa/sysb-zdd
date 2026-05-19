'use server';

/**
 * /app/actions/iris.ts
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { IrisOrchestrator } from '@/lib/iris/orchestrator';
import { evaluateExitCriteria } from '@/lib/iris/condition-evaluator';
import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';
import type { LeadStage, Task, CoachState } from '@/lib/iris/types';
import type { CriterionResult } from '@/lib/iris/condition-evaluator';

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

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, contacts(*)')
    .eq('id', leadId)
    .single();

  if (error || !lead) throw new Error('Lead not found');

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId);

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const orchestrator = new IrisOrchestrator(lead, coachState, undefined, tasks || []);
  const postFeedbackResult = await orchestrator.onFeedbackSubmit(taskConfigId, answers);

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

  const updatedCoachState = mergeIntoCoachState(coachState, savesTo, answers);
  await supabase
    .from('leads')
    .update({ ai_coach_state: updatedCoachState })
    .eq('id', leadId);

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

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId);

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const orchestrator = new IrisOrchestrator(lead, coachState, undefined, tasks || []);

  const stageEntry = await orchestrator.onStageEntry(stage);
  if (!stageEntry) return { message: null, suggestedTasks: [] };

  const { message, tasks: suggestedTasks } = stageEntry;

  await supabase.from('ai_coach_logs').insert({
    lead_id: leadId,
    stage,
    type: 'entry',
    message,
    suggested_tasks: suggestedTasks,
  });

  return { message, suggestedTasks };
}

export async function confirmAndCreateTasks({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: Partial<Task>[];
}) {
  const supabase = await createClient();

  const tasksToInsert = tasks.map(task => ({
    lead_id: leadId,
    stage: task.stage,
    task_config_id: task.task_config_id,
    title: task.title!,
    channel: task.channel!,
    due_date: task.due_date!,
    required: task.required ?? false,
    iris_tip: task.iris_tip ?? null,
    status: 'pending' as const,
    feedback_submitted: false,
    user_approved: false,
    auto_prompt: task.auto_prompt ?? false,
  }));

  const { error } = await supabase.from('tasks').insert(tasksToInsert);
  if (error) throw new Error(`Failed to create tasks: ${error.message}`);

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

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

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId);

  const coachState = (lead.ai_coach_state as CoachState) || {};
  const orchestrator = new IrisOrchestrator(lead, coachState, undefined, allTasks || []);

  const gate = orchestrator.canCompleteTask(taskConfigId, task);
  if (!gate.allowed) {
    return { ok: false, message: gate.message };
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (updateError) throw new Error(`Failed to complete task: ${updateError.message}`);

  const stage = lead.status as LeadStage;
  const stageConfig = IRIS_PLAYBOOK[stage];
  
  // Re-fetch completed task configuration tags including this item
  const nextCompletedSet = new Set((allTasks || []).map(t => t.task_config_id).filter(Boolean) as string[]);
  nextCompletedSet.add(taskConfigId);

  const dependents = stageConfig?.tasks.filter(t => {
    if (!t.depends_on?.includes(taskConfigId)) return false;
    return t.depends_on.every(depId => nextCompletedSet.has(depId));
  }) ?? [];

  if (dependents.length > 0) {
    const newTasks = dependents.map(t => ({
      lead_id: leadId,
      stage,
      task_config_id: t.id,
      title: t.title,
      channel: t.channel === 'auto' ? 'email' : t.channel,
      due_date: addBusinessDays(new Date(), t.due_business_days).toISOString(),
      required: t.required,
      iris_tip: t.iris_tip ?? null,
      status: 'pending' as const,
      feedback_submitted: false,
      user_approved: false,
      auto_prompt: t.feedback_prompt?.trigger === 'on_create',
    }));

    const { error: insertError } = await supabase.from('tasks').insert(newTasks);
    if (!insertError) {
      await supabase.from('ai_coach_logs').insert({
        lead_id: leadId,
        stage,
        type: 'task_unlocked',
        message: `Task complete. I've unlocked ${newTasks.length} follow-up ${newTasks.length === 1 ? 'task' : 'tasks'} for you.`,
        suggested_tasks: newTasks,
      });
    }
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

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

/**
 * Persist AI-Generated drafts contextually inside the lead's state.
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
  const { data: lead } = await supabase.from('leads').select('ai_coach_state').eq('id', leadId).single();
  if (!lead) throw new Error('Lead missing');

  const state = (lead.ai_coach_state as Record<string, any>) || {};
  if (!state.ai_drafts) state.ai_drafts = {};
  state.ai_drafts[actionKey] = payload;

  await supabase.from('leads').update({ ai_coach_state: state }).eq('id', leadId);
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

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