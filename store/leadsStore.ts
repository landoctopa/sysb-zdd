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

// Lead status type from database enum (if generated) or fallback to string
export type LeadStatus = LeadRow['status']; // This will be the enum type

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

  // Optimistic update
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
    // Rollback
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

  // Optimistic update
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
    // Rollback
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

  const newStatus = completed ? 'completed' : 'pending';
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
    // Rollback
    $activeTasks.set(currentTasks);
    toast.error('Failed to update task');
  }
}