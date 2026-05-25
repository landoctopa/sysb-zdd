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

export type LeadStatus = LeadRow['status'];

// --- Atoms ---
export const $leadsList = atom<LeadRow[]>([]);
export const $activeLead = atom<LeadRow | null>(null);
export const $activeContacts = atom<ContactRow[]>([]);
export const $activeTasks = atom<TaskRow[]>([]);
export const $activeCoachLogs = atom<CoachLogRow[]>([]);
export const $activeCommunications = atom<CommunicationRow[]>([]);
export const $isSyncing = atom<boolean>(false);
export const $uiAddContactModalOpen = atom<boolean>(false);

// --- Helper: Sync Fresh Lead State Tasks (Guarantees background Iris entries reflect instantly) ---
export async function refreshActiveTasks(leadId: string) {
  try {
    const res = await fetch(`/api/leads/${leadId}/tasks`);
    if (res.ok) {
      const freshTasks = await res.json();
      $activeTasks.set(freshTasks);
    }
  } catch (err) {
    console.error('Failed to sync tasks collection from database', err);
  }
}

// --- Action: Update lead metadata (DB-First) ---
export async function updateLeadMetadata(leadId: string, answers: Record<string, any>) {
  const lead = $activeLead.get();
  if (!lead || lead.id !== leadId) return;

  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/leads/${leadId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    
    if (!res.ok) throw new Error('Failed to update metadata');

    // DB update succeeded -> Compute and update state using server-verified values
    const updatedState = {
      ...(lead.ai_coach_state as any || {}),
      answers: {
        ...((lead.ai_coach_state as any)?.answers || {}),
        ...answers,
      },
    };
    $activeLead.set({ ...lead, ai_coach_state: updatedState });
    toast.success('Information saved');
  } catch (error) {
    toast.error('Could not save information');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Update lead status (DB-First) ---
export async function updateLeadStatus(newStatus: LeadStatus) {
  const lead = $activeLead.get();
  if (!lead) return;

  const currentList = $leadsList.get();
  $isSyncing.set(true);

  try {
    const res = await fetch(`/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!res.ok) throw new Error('Sync failed');
    
    // Server processed successfully -> Update store with live changes
    $activeLead.set({ ...lead, status: newStatus });
    $leadsList.set(
      currentList.map(l => l.id === lead.id ? { ...l, status: newStatus } : l)
    );
    
    // Cascade re-fetch: Pipeline changes cause Iris to append background tasks
    await refreshActiveTasks(lead.id);
    toast.success(`Stage updated to ${newStatus}`);
  } catch (error) {
    toast.error('Failed to update stage in database.');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Add communication (DB-First) ---
export async function addCommunication(leadId: string, commData: Partial<CommunicationRow>) {
  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/leads/${leadId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commData),
    });
    
    if (!res.ok) throw new Error('Database rejected communication log entry');
    
    // Core Fix: Insert the real database row object containing the verified server UUID
    const verifiedComm = await res.json();
    const currentComms = $activeCommunications.get();
    $activeCommunications.set([verifiedComm, ...currentComms]);
    
    return verifiedComm;
  } catch (err) {
    toast.error('Failed to log communication to database');
    throw err;
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Add task (DB-First) ---
export async function addTask(leadId: string, taskData: Partial<TaskRow>) {
  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/leads/${leadId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    
    if (!res.ok) throw new Error('Database rejected task insertion payload');
    
    // Core Fix: Populate UI with the real row containing the verified database constraints
    const verifiedTask = await res.json();
    const currentTasks = $activeTasks.get();
    $activeTasks.set([verifiedTask, ...currentTasks]);
    
    return verifiedTask;
  } catch (err) {
    toast.error('Failed to save task');
    throw err;
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Toggle task completion (DB-First) ---
export async function toggleTaskCompletion(taskId: string, completed: boolean) {
  const currentTasks = $activeTasks.get();
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;

  const newStatus: TaskRow['status'] = completed ? 'completed' : 'pending';
  $isSyncing.set(true);

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!res.ok) throw new Error('Failed to patch server task state');
    
    // Update store only after database confirms success
    $activeTasks.set(currentTasks.map(t =>
      t.id === taskId ? { ...t, status: newStatus, completed_at: completed ? new Date().toISOString() : null } : t
    ));
    
    toast.success(completed ? 'Task completed' : 'Task reopened');
  } catch (err) {
    toast.error('Failed to update task state in database');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Complete Core Task (DB-First) ---
export async function completeTaskOptimistic(taskId: string, taskConfigId: string) {
  const currentTasks = $activeTasks.get();
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;

  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: task.lead_id, taskId, taskConfigId })
    });
    
    const result = await res.json();

    if (!res.ok || (!result.ok && result.message)) {
      toast.error(result.message || 'Iris validation check failed');
    } else {
      // Cascade re-fetch: Iris unlocks hidden steps or shifts properties upon task resolution
      await refreshActiveTasks(task.lead_id);
      toast.success('Task completed');
    }
  } catch (err) {
    toast.error('Server execution failed');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Approve Artifact (DB-First) ---
export async function approveTaskOptimistic(taskId: string) {
  const lead = $activeLead.get();
  if (!lead) return;
  const currentTasks = $activeTasks.get();

  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, taskId })
    });

    if (!res.ok) throw new Error('Artifact approval failed on backend');
    
    // Update client UI container inline after server validation passes
    $activeTasks.set(currentTasks.map(t => t.id === taskId ? { ...t, user_approved: true } : t));
    toast.success('Approved');
  } catch {
    toast.error('Server approval sequence failed');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Submit Informational Prompt Feedback (DB-First) ---
export async function submitFeedbackOptimistic(leadId: string, taskConfigId: string, answers: Record<string, any>, savesTo: string) {
  const lead = $activeLead.get();
  $isSyncing.set(true);

  try {
    const res = await fetch(`/api/iris/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, taskConfigId, answers, savesTo })
    });

    if (!res.ok) throw new Error('Server rejected feedback submission payload');
    const result = await res.json();
    
    // Deep-merge state variations safely inside user space after database commit completes
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
    
    // Sync related active tasks tasks layout
    const currentTasks = $activeTasks.get();
    $activeTasks.set(currentTasks.map(t => 
      t.task_config_id === taskConfigId ? { ...t, feedback_submitted: true, feedback_answers: answers } : t
    ));

    toast.success('Feedback saved');
    return result;
  } catch(err) {
    toast.error('Failed to save feedback data to database');
    throw err;
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Lock Down & Deploy Stage Playbook (DB-First) ---
export async function confirmStageTasksOptimistic(leadId: string, tasks: Partial<TaskRow>[]) {
  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, tasks })
    });

    if (!res.ok) throw new Error('Playbook confirmation failed on backend');
    
    // Fetch live task database records to completely hydrate the workspace
    await refreshActiveTasks(leadId);
    toast.success('Tasks unlocked successfully');
  } catch {
    toast.error('Failed to register tasks to database');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Cache Generation Artifact Drafts (DB-First) ---
export async function persistAiDraftOptimistic(leadId: string, actionKey: string, draftPayload: any) {
  const lead = $activeLead.get();
  if (!lead) return;

  try {
    const res = await fetch(`/api/iris/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, actionKey, payload: draftPayload })
    });
    
    if (!res.ok) throw new Error('Draft caching failed');

    // Merge into local active client state once successfully saved to database
    const state = JSON.parse(JSON.stringify(lead.ai_coach_state || {}));
    if (!state.ai_drafts) state.ai_drafts = {};
    state.ai_drafts[actionKey] = draftPayload;
    $activeLead.set({ ...lead, ai_coach_state: state });
  } catch {
    console.error('Failed to cache draft copy to server database');
  }
}