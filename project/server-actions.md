# Server Actions (app/actions)

Server actions are small server-side helpers placed in `app/actions/*`. They are intended to be imported by API routes or other server code and encapsulate reusable server logic.

Key file: `app/actions/iris.ts`
- Exports:
  - `export async function saveIrisDraft({ leadId, actionKey, payload })` — persists AI-generated draft payload into the `leads.ai_coach_state.ai_drafts[actionKey]` JSON field and calls `revalidatePath(`/leads/${leadId}`)` to refresh cached pages.

Behavior & purpose:
- `saveIrisDraft` loads the lead `ai_coach_state`, sets the draft payload into `ai_drafts[actionKey]`, updates the lead row with the new JSONB value, and triggers route revalidation for the lead page.

Where used:
- Called by `app/api/iris/generate/route.ts` after an orchestrator produces a draft, and by `app/api/iris/drafts/route.ts`.

Recommendation:
- Export additional helpers (e.g., `getLeadState`, `mergeLeadState`) for clearer unit testing and reuse.
