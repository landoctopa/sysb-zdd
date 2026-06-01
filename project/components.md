# Components — catalog and key exports

This file lists the main component groups and notable components used by pages. For each component we note exported symbols and key props/functions.

components/layout
- `PageContainer.tsx`
  - Exports: `PageContainer` (named export)
  - Props: `children`, `className`, `maxWidth`, `noPadding`
  - Purpose: Centralizes max-width/padding and uses `lib/utils.cn` for class merging.

components/leads
- `LeadsListHydrator.tsx`
  - Exports: default `LeadsListHydrator({ leads })` — client component that sets `$leadsList` on mount.
- `PipelineHeader.tsx`
  - Exports: default `PipelineHeader({ lead, actions, contacts, setLead })`
  - Key functions: `handleAdvanceStage` triggers a PATCH to `/api/leads/{id}` to advance stage; uses `toast` for feedback.
- `PipelineView.tsx` (in `app/leads`) — renders pipeline KPIs and lead cards; reads `$leadsList` atom.
- `LeadWorkbenchClient.tsx`
  - Exports: default client component; props: `initialLead`, `initialActions`, `initialContacts`.
  - Contains local handlers for actions (create/update) and composes `PipelineHeader`, `NotesWidget`, `DiscoveryStageWorkspace`, etc.
- `NotesWidget.tsx`
  - Exports: default `NotesWidget({ leadId, currentStage, onNoteSaved })`
  - Key function: `handleSaveNote` posts to `/api/actions` to log a note and calls `onNoteSaved` with the returned action.

components/landing
- `DemoMatch.tsx` — small marketing/demo component used on home page.

components/ui
- A design system of primitives (files listed below) — each typically exports a default component plus small helpers/types:
  - `accordion.tsx`, `alert-dialog.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `copy-button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`

Notes about UI primitives
- These are presentational components — prefer composition at page level and keep logic in small hooks or store actions.
- `sonner.tsx` wraps the notification system (`toast`, `Toaster`) used throughout the app.
