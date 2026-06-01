// store/leadsStore.ts
import { atom } from 'nanostores';
import { Database } from '../database.types';
import { toast } from 'sonner';

// Re-export core row types for convenience
export type LeadRow = Database['public']['Tables']['leads']['Row'];
export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type ActionRow = Database['public']['Tables']['actions']['Row'];
export type CoachLogRow = Database['public']['Tables']['ai_coach_logs']['Row'];

export type LeadStatus = LeadRow['status'];
export type ActionStatus = Database['public']['Enums']['action_status'];

// --- Atoms ---
export const $leadsList = atom<LeadRow[]>([]);
export const $activeLead = atom<LeadRow | null>(null);
export const $activeContacts = atom<ContactRow[]>([]);
export const $activeActions = atom<ActionRow[]>([]); // Unified table store
export const $activeCoachLogs = atom<CoachLogRow[]>([]);
export const $isSyncing = atom<boolean>(false);
export const $uiAddContactModalOpen = atom<boolean>(false);

// --- Helper: Sync Fresh Lead Playbook Actions (Guarantees background Iris entries reflect instantly) ---
export async function refreshActiveActions(leadId: string) {
  try {
    const res = await fetch(`/api/leads/${leadId}/tasks`); // Points to synced Playbook task retrieval
    if (res.ok) {
      const freshActions = await res.json();
      $activeActions.set(freshActions);
    }
  } catch (err) {
    console.error('Failed to sync actions ledger collection from database', err);
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
    
    $activeLead.set({ ...lead, status: newStatus });
    $leadsList.set(
      currentList.map(l => l.id === lead.id ? { ...l, status: newStatus } : l)
    );
    
    // Cascade re-fetch: Pipeline changes cause Iris to append background tasks
    await refreshActiveActions(lead.id);
    toast.success(`Stage updated to ${newStatus}`);
  } catch (error) {
    toast.error('Failed to update stage in database.');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Create New Unified Action (Handles tasks, notes, communications via API) ---
export async function addLeadAction(leadId: string, actionData: Partial<ActionRow>) {
  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, ...actionData }),
    });
    
    if (!res.ok) throw new Error('Database rejected action creation payload');
    
    const verifiedAction = await res.json();
    const currentActions = $activeActions.get();
    $activeActions.set([verifiedAction, ...currentActions]);
    
    return verifiedAction;
  } catch (err) {
    toast.error(`Failed to log ${actionData.type || 'action'}`);
    throw err;
  } finally {
    $isSyncing.set(false);
  }
}

// --- Action: Toggle Action Completion State (DB-First) ---
export async function toggleActionStatus(actionId: string, completed: boolean) {
  const currentActions = $activeActions.get();
  const action = currentActions.find(a => a.id === actionId);
  if (!action) return;

  const newStatus: ActionStatus = completed ? 'completed' : 'pending';
  $isSyncing.set(true);

  try {
    // Hits the centralized actions management endpoint
    const res = await fetch(`/api/tasks/${actionId}`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!res.ok) throw new Error('Failed to patch server action state');
    
    $activeActions.set(currentActions.map(a =>
      a.id === actionId ? { 
        ...a, 
        status: newStatus, 
        completed_at: completed ? new Date().toISOString() : null 
      } : a
    ));
    
    toast.success(completed ? 'Marked complete' : 'Reopened successfully');
  } catch (err) {
    toast.error('Failed to update item state in database');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Complete Core Playbook Task Gate (DB-First) ---
export async function completeTaskOptimistic(actionId: string, taskConfigId: string) {
  const currentActions = $activeActions.get();
  const action = currentActions.find(a => a.id === actionId);
  if (!action) return;

  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: action.lead_id, taskId: actionId, taskConfigId })
    });
    
    const result = await res.json();

    if (!res.ok || (!result.ok && result.message)) {
      toast.error(result.message || 'Iris validation check failed');
    } else {
      // Cascade re-fetch: Playbook execution recalculates your new dependent task ledger stack
      await refreshActiveActions(action.lead_id);
      toast.success('Task completed');
    }
  } catch (err) {
    toast.error('Server validation execution failed');
  } finally {
    $isSyncing.set(false);
  }
}

// --- Iris Action: Approve Core Generation Artifact (DB-First) ---
export async function approveTaskOptimistic(actionId: string) {
  const lead = $activeLead.get();
  if (!lead) return;
  const currentActions = $activeActions.get();

  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, taskId: actionId })
    });

    if (!res.ok) throw new Error('Artifact approval failed on backend');
    
    // Update structural user_approved flag stored in metadata JSONB safely
    $activeActions.set(currentActions.map(a => 
      a.id === actionId ? { 
        ...a, 
        metadata: typeof a.metadata === 'object' && a.metadata !== null 
          ? { ...a.metadata, user_approved: true } 
          : { user_approved: true }
      } : a
    ));
    toast.success('Approved copy artifact');
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
    
    // Track feedback completion status updates directly on action items matching config definitions
    const currentActions = $activeActions.get();
    $activeActions.set(currentActions.map(a => {
      const meta = (a.metadata as Record<string, any>) || {};
      if (meta.task_config_id === taskConfigId) {
        return {
          ...a,
          metadata: { ...meta, feedback_submitted: true, feedback_answers: answers }
        };
      }
      return a;
    }));

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
export async function confirmStageTasksOptimistic(leadId: string, tasks: Partial<ActionRow>[]) {
  $isSyncing.set(true);
  try {
    const res = await fetch(`/api/iris/tasks/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, tasks })
    });

    if (!res.ok) throw new Error('Playbook confirmation failed on backend');
    
    await refreshActiveActions(leadId);
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

    const state = JSON.parse(JSON.stringify(lead.ai_coach_state || {}));
    if (!state.ai_drafts) state.ai_drafts = {};
    state.ai_drafts[actionKey] = draftPayload;
    $activeLead.set({ ...lead, ai_coach_state: state });
  } catch {
    console.error('Failed to cache draft copy to server database');
  }
}