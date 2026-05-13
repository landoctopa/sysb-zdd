import { atom } from 'nanostores';
import { Database } from '../database.types'; 
import { toast } from 'sonner';

// 1. Map all Database Types
export type LeadRow = Database['public']['Tables']['leads']['Row'];
export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type CoachLogRow = Database['public']['Tables']['ai_coach_logs']['Row'];
export type CommunicationRow = Database['public']['Tables']['communications']['Row'];

// --- Atoms ---

export const $leadsList = atom<LeadRow[]>([]);
export const $activeLead = atom<LeadRow | null>(null);
export const $activeContacts = atom<ContactRow[]>([]);
export const $activeTasks = atom<TaskRow[]>([]);
export const $activeCoachLogs = atom<CoachLogRow[]>([]);
export const $activeCommunications = atom<CommunicationRow[]>([]);

export const $isSyncing = atom<boolean>(false);

// --- Actions (Standard Functions) ---

/**
 * Optimistically updates the lead status and syncs with the backend.
 * In Nanostores 1.x, we just use a regular function that calls .set() and .get()
 */
export async function updateLeadStatus(newStatus: LeadRow['status']) {
  const lead = $activeLead.get();
  if (!lead) return;

  const oldStatus = lead.status;
  const currentList = $leadsList.get();

  // 1. OPTIMISTIC UPDATE
  // We update the atoms directly using .set()
  $activeLead.set({ ...lead, status: newStatus });
  
  $leadsList.set(
    currentList.map(l => l.id === lead.id ? { ...l, status: newStatus } : l)
  );

  $isSyncing.set(true);

  try {
    // 2. BACKEND SYNC
    const res = await fetch(`/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) throw new Error('Sync failed');

    toast.success(`Stage updated to ${newStatus}`);
  } catch (error) {
    // 3. ROLLBACK: Revert if the server fails
    $activeLead.set({ ...lead, status: oldStatus });
    $leadsList.set(
      currentList.map(l => l.id === lead.id ? { ...l, status: oldStatus } : l)
    );
    
    toast.error('Failed to sync. Reverting stage.');
  } finally {
    $isSyncing.set(false);
  }
}

export async function addCommunication(leadId: string, commData: any) {
  const currentComms = $activeCommunications.get();
  const tempId = `temp-${Date.now()}`;
  const optimisticComm = { id: tempId, ...commData, lead_id: leadId, created_at: new Date().toISOString() };
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
    // rollback
    $activeCommunications.set(currentComms);
    toast.error('Failed to log communication');
    throw err;
  }
}

export async function addTask(leadId: string, taskData: any) {
  const currentTasks = $activeTasks.get();
  const tempId = `temp-${Date.now()}`;
  const optimisticTask = { id: tempId, ...taskData, lead_id: leadId, created_at: new Date().toISOString() };
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