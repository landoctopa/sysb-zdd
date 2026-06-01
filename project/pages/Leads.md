# Page: Leads (`app/leads/page.tsx`)

Path: `app/leads/page.tsx`

Summary:
- Server page that lists the user's leads and hydrates client stores.
- Fetches `leads` rows from Supabase and renders `LeadsListHydrator` and `PipelineView`.

Key imports and dependencies:
- `createClient()` from `utils/supabase/server.ts` — server Supabase client.
- `LeadsListHydrator` from `components/leads/LeadsListHydrator.tsx` — hydrates the client-side leads store with server data.
- `PipelineView` from `app/leads/PipelineView.tsx` — client component showing the pipeline and KPIs.
- `PageContainer` from `components/layout/PageContainer.tsx` — layout wrapper.

Behavior & important code paths:
- Calls `supabase.from('leads').select('*').order('hotness_score', { ascending: false })` to fetch all leads for the current tenant context (server client will respect cookies/session).
- Passes the server-fetched `leads` to `LeadsListHydrator` which sets the `$leadsList` atom in `store/leadsStore.ts` for client components to use.

Transitive dependencies (what this page depends on):
- `components/leads/LeadsListHydrator.tsx` — uses `$leadsList` atom and calls `.set(leads)` on mount.
- `app/leads/PipelineView.tsx` — reads `$leadsList` and renders grouped lists, links to `/leads/[id]`.
- `components/layout/PageContainer.tsx` — generic layout helper using `lib/utils.cn` for class names.

APIs used indirectly:
- This page's client components call routes such as `/api/leads/[id]` (PATCH) and `/api/actions` (POST/GET) when users interact.

Notes for maintainers:
- Keep the server select columns compatible with `database.types.ts` Lead row schema; `select('*')` is used to ensure full schema hydration.
- The `LeadsListHydrator` intentionally returns `null` and only sets store state — this pattern avoids double-rendering.
