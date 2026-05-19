// store/leadsStore.ts
import { atom } from 'nanostores';
import { Database } from '../database.types';
import { toast } from 'sonner';

// Re-export all row types for convenience
export type LeadRow = Database['public']['Tables']['leads']['Row'];
export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type CoachLogRow = Database['public']['Tables']['ai_coach_logs']['Row'];
export type CommunicationRow = Database['public']['Tables']['communications']['Row'];

// Lead status type from database enum
export type LeadStatus = LeadRow['status'];

// --- Atoms ---
export const $leadsList = atom<LeadRow[]>([]);
export const $activeLead = atom<LeadRow | null>(null);
export const $activeContacts = atom<ContactRow[]>([]);
export const $activeTasks = atom<TaskRow[]>([]);
export const $activeCoachLogs = atom<CoachLogRow[]>([]);
export const $activeCommunications = atom<CommunicationRow[]>([]);
export const $isSyncing = atom<boolean>(false);

// --- Helper: Update lead metadata (ai_coach_state) ---
export async function updateLeadMetadata(leadId: string, answers: Record<string, any>) {
  const lead = $activeLead.get();
  if (!lead || lead.id !== leadId) return;

  const optimisticState = {
    ...(lead.ai_coach_state as any || {}),
    answers: {
      ...((lead.ai_coach_state as any)?.answers || {}),
      ...answers,
    },
  };

  $activeLead.set({ ...lead, ai_coach_state: optimisticState });

  try {
    const res = await fetch(`/api/leads/${leadId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to update metadata');
    toast.success('Information saved');
  } catch (error) {
    $activeLead.set(lead);
    toast.error('Could not save information');
  }
}

// --- Action: Update lead status (with optimistic update) ---
export async function updateLeadStatus(newStatus: LeadStatus) {
  const lead = $activeLead.get();
  if (!lead) return;

  const oldStatus = lead.status;
  const currentList = $leadsList.get();

  $activeLead.set({ ...lead, status: newStatus });
  $leadsList.set(
    currentList.map(l => l.id === lead.id ? { ...l, status: newStatus } : l)
  );
  $isSyncing.set(true);

  try {
    const res = await fetch(`/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Sync failed');
    toast.success(`Stage updated to ${newStatus}`);
  } catch (error) {
    $activeLead.set({ ...lead, status: oldStatus });
    $leadsList.set(
      currentList.map(l => l.id === lead.id ? { ...l, status: oldStatus } : l)
    );
    toast.error('Failed to sync. Reverting stage.');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Add communication (optimistic) ---
export async function addCommunication(leadId: string, commData: Partial<CommunicationRow>) {
  const currentComms = $activeCommunications.get();
  const tempId = `temp-${Date.now()}`;
  const optimisticComm = {
    id: tempId,
    ...commData,
    lead_id: leadId,
    created_at: new Date().toISOString(),
  } as CommunicationRow;
  $activeCommunications.set([optimisticComm, ...currentComms]);

  try {
    const res = await fetch(`/api/leads/${leadId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commData),
    });
    if (!res.ok) throw new Error();
    const newComm = await res.json();
    $activeCommunications.set([newComm, ...currentComms]);
    return newComm;
  } catch (err) {
    $activeCommunications.set(currentComms);
    toast.error('Failed to log communication');
    throw err;
  }
}

// --- Action: Add task (optimistic) ---
export async function addTask(leadId: string, taskData: Partial<TaskRow>) {
  const currentTasks = $activeTasks.get();
  const tempId = `temp-${Date.now()}`;
  const optimisticTask = {
    id: tempId,
    ...taskData,
    lead_id: leadId,
    created_at: new Date().toISOString(),
  } as TaskRow;
  $activeTasks.set([optimisticTask, ...currentTasks]);

  try {
    const res = await fetch(`/api/leads/${leadId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error();
    const newTask = await res.json();
    $activeTasks.set([newTask, ...currentTasks]);
    return newTask;
  } catch (err) {
    $activeTasks.set(currentTasks);
    toast.error('Failed to add task');
    throw err;
  }
}

// --- Action: Toggle task completion (optimistic) ---
export async function toggleTaskCompletion(taskId: string, completed: boolean) {
  const currentTasks = $activeTasks.get();
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;

  const newStatus: TaskRow['status'] = completed ? 'completed' : 'pending';
  const updatedTasks = currentTasks.map(t =>
    t.id === taskId ? { ...t, status: newStatus } : t
  );
  $activeTasks.set(updatedTasks);

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error();
    toast.success(completed ? 'Task completed' : 'Task reopened');
  } catch (err) {
    $activeTasks.set(currentTasks);
    toast.error('Failed to update task');
  }
}

// ============================================================
// PURE BROWSER-SAFE IRIS ACTIONS (ENVIRONMENT AGNOSTIC)
// ============================================================

export async function completeTaskOptimistic(taskId: string, taskConfigId: string) {
  const currentTasks = $activeTasks.get();
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;

  // Optimistic local UI push
  $activeTasks.set(currentTasks.map(t => 
    t.id === taskId ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t
  ));

  try {
    const res = await fetch(`/api/iris/tasks/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: task.lead_id, taskId, taskConfigId })
    });
    
    const result = await res.json();

    if (!res.ok || (!result.ok && result.message)) {
      // Graceful rollback to pristine collection state on blocker gates
      $activeTasks.set(currentTasks);
      toast.error(result.message || 'Failed to complete task');
    } else {
      toast.success('Task completed');
    }
  } catch (err) {
    $activeTasks.set(currentTasks);
    toast.error('Failed to complete task');
  }
}

export async function approveTaskOptimistic(taskId: string) {
  const lead = $activeLead.get();
  if (!lead) return;
  const currentTasks = $activeTasks.get();

  // Optimistic state lock
  $activeTasks.set(currentTasks.map(t => t.id === taskId ? { ...t, user_approved: true } : t));
  
  try {
    const res = await fetch(`/api/iris/tasks/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, taskId })
    });

    if (!res.ok) throw new Error();
    toast.success('Approved');
  } catch {
    $activeTasks.set(currentTasks);
    toast.error('Approval failed');
  }
}

export async function submitFeedbackOptimistic(leadId: string, taskConfigId: string, answers: Record<string, any>, savesTo: string) {
  const currentTasks = $activeTasks.get();
  const lead = $activeLead.get();

  // 1. Optimistically mark task feedback flag locally
  $activeTasks.set(currentTasks.map(t => 
    t.task_config_id === taskConfigId ? { ...t, feedback_submitted: true, feedback_answers: answers } : t
  ));

  // 2. Deep merge answers inline instantly inside client state so exit criteria check works cleanly
  if (lead) {
    const parts = savesTo.split('.');
    const newState = JSON.parse(JSON.stringify(lead.ai_coach_state || {}));
    let target = newState;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part]) target[part] = {};
      target = target[part];
    }
    const lastPart = parts[parts.length - 1];
    target[lastPart] = { ...target[lastPart], ...answers };
    $activeLead.set({ ...lead, ai_coach_state: newState });
  }

  try {
    const res = await fetch(`/api/iris/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, taskConfigId, answers, savesTo })
    });

    if (!res.ok) throw new Error();
    const result = await res.json();
    toast.success('Feedback saved');
    return result;
  } catch(err) {
    $activeTasks.set(currentTasks);
    if (lead) $activeLead.set(lead);
    toast.error('Failed to save feedback');
    throw err;
  }
}

export async function confirmStageTasksOptimistic(leadId: string, tasks: Partial<TaskRow>[]) {
  const currentTasks = $activeTasks.get();
  
  // 1. Generate local temporary tasks for instant UI responsiveness
  const optimisticTasks = tasks.map(t => ({ 
    ...t, 
    id: `temp-${Date.now()}-${Math.random()}`,
    status: 'pending' as const,
    lead_id: leadId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    feedback_submitted: false,
    user_approved: false,
  })) as TaskRow[];
  
  $activeTasks.set([...optimisticTasks, ...currentTasks]);

  try {
    const res = await fetch(`/api/iris/tasks/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, tasks })
    });

    if (!res.ok) throw new Error();
    
    // FIX: Re-fetch the live task collection from the server to pull the real UUID strings
    const tasksRes = await fetch(`/api/leads/${leadId}/tasks`);
    if (tasksRes.ok) {
      const freshTasks = await tasksRes.json();
      $activeTasks.set(freshTasks); // Cleanly hydrates the workspace
    }
    
    toast.success('Tasks unlocked successfully');
  } catch {
    // Graceful rollback on network failure
    $activeTasks.set(currentTasks);
    toast.error('Failed to create tasks');
  }
}

export async function persistAiDraftOptimistic(leadId: string, actionKey: string, draftPayload: any) {
  const lead = $activeLead.get();
  if (!lead) return;

  const state = JSON.parse(JSON.stringify(lead.ai_coach_state || {}));
  if (!state.ai_drafts) state.ai_drafts = {};
  state.ai_drafts[actionKey] = draftPayload;

  $activeLead.set({ ...lead, ai_coach_state: state });

  try {
    const res = await fetch(`/api/iris/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, actionKey, payload: draftPayload })
    });
    if (!res.ok) throw new Error();
  } catch {
    toast.error('Failed to cache draft copy to server database');
  }
}