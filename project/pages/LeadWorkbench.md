# Page: Lead Workbench (`app/leads/[id]/page.tsx`)

Path: `app/leads/[id]/page.tsx`

Summary:
- Server page responsible for rendering the lead workbench for a specific lead id. It loads lead, actions, and contacts data and composes the client `LeadWorkbenchClient`.
- Performs background synchronization of related `raw_signals` to keep `ai_coach_state.lead_signals` up to date.

Key imports and dependencies:
- `createClient()` from `utils/supabase/server.ts` — server Supabase client.
- `notFound` from `next/navigation` — to return 404 when lead not found.
- `LeadWorkbenchClient` from `app/leads/[id]/LeadWorkbenchClient.tsx` — main client UI for the lead.

Behavior & important code paths:
- Reads `id` from route params and fetches the lead record: `supabase.from('leads').select('*').eq('id', id).single()`.
- If the lead contains `company_name`, it queries `raw_signals` for overlapping signals and appends any new signals into `lead.ai_coach_state.lead_signals`, persisting the updated `ai_coach_state` back to the `leads` table.
- Fetches related `actions` and `contacts` for the lead and passes `initialLead`, `initialActions`, and `initialContacts` props to the `LeadWorkbenchClient` client component.

Client composition (what the page includes):
- `LeadWorkbenchClient` — client component that provides tabs, notes, pipeline header, network views, notes widget, and more. It depends on many `components/*` primitives.

APIs & server endpoints used by the workbench UI:
- `/api/leads/[id]` — PATCH endpoint used by components (e.g., `PipelineHeader`) to update lead status and fields.
- `/api/actions` — for logging notes and tasks (POST/GET).
- `/api/iris/*` — for AI orchestration (generate/drafts/feedback/confirm endpoints).

Notes for maintainers:
- The page mutates `leads` rows and `ai_coach_state` JSONB objects; ensure migrations preserve JSON shapes.
- For caching/ISR, the page calls `revalidatePath` from server actions (e.g., `app/actions/iris.ts`) after persisting drafts.
