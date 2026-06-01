# Stores — client state management (`store/`)

This project uses `nanostores` to manage lightweight client state shared across components.

Files and key exports:

- `store/profileStore.ts`
  - Exports: `$profile` atom (type: `ProfileRow | null`).
  - Purpose: Holds the current user profile for client components.

- `store/leadsStore.ts`
  - Exports: multiple atoms and actions:
    - `$leadsList`, `$activeLead`, `$activeContacts`, `$activeTasks`, `$activeCoachLogs`, `$activeCommunications`, `$isSyncing`, `$uiAddContactModalOpen`.
    - Action functions:
      - `refreshActiveTasks(leadId)` — fetches `/api/leads/{leadId}/tasks` and sets `$activeTasks`.
      - `updateLeadMetadata(leadId, answers)` — PATCHes `/api/leads/{leadId}/metadata` and updates `$activeLead.ai_coach_state.answers`.
      - `updateLeadStatus(newStatus)` — PATCHes `/api/leads/{lead.id}/status` and updates `$activeLead` and `$leadsList` on success.
      - `addCommunication(leadId, commData)` — POST `/api/leads/{leadId}/communications`, inserts into `$activeCommunications`.
      - `addTask(leadId, taskData)` — POST `/api/leads/{leadId}/tasks`, inserts into `$activeTasks`.
      - Many optimistic Iris-related actions: `completeTaskOptimistic`, `approveTaskOptimistic`, `submitFeedbackOptimistic`, `confirmStageTasksOptimistic`, `persistAiDraftOptimistic`.

Notes:
- Stores implement DB-first update patterns: call the API and only update local state after server success, minimizing divergence.
- For unit testing, export small helpers from stores rather than coupling to `fetch` calls directly.
