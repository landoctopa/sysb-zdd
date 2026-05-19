# Pages & Lead Components — sysb-dashboard

This document describes the primary Next.js pages and client components used for lead viewing and interaction.

Pages (server or hybrid)

- `app/page.tsx` — Root dashboard page. Exports a server `Page()` component that renders the main UI and fetches initial data.
- `app/login/page.tsx` — Login page that renders provider buttons and a login form; typically a client component or hybrid.
- `app/leads/page.tsx` — Leads listing page. Exports server `Page()` which renders `LeadsClient` with initial data.
- `app/leads/[id]/page.tsx` — Lead detail page. Exports server `Page({ params })` that fetches lead data and composes client components.

Client components (lead area)

- `LeadsClient.tsx`
  - Export(s): `export default function LeadsClient(props: { initialLeads?: Lead[] })`
  - Purpose: Renders list, search, filters, and actions (bulk operations, create lead).
  - Optional helpers: `useLeads()` hook for fetching and caching.

- `LeadDetailClient.tsx`
  - Export(s): `export default function LeadDetailClient({ leadId }: { leadId: string })`
  - Purpose: Shows full lead details, notes, company, and quick actions.

- `LeadNetworkClient.tsx`
  - Export(s): `export default function LeadNetworkClient({ leadId }: { leadId: string })`
  - Purpose: Render network connections (graph or list) and allow navigation to related leads.

- `LeadStatusSelector.tsx`
  - Export(s): `export default function LeadStatusSelector({ value, onChange })`
  - Purpose: Controlled select component to mutate lead status. Typically calls an API route to persist changes.

Integration notes

- Pages use server-side fetching where possible for SEO and initial load; interactive parts are client components.
- Keep data fetching logic for single-lead fetches in small helpers (`lib/` or `utils/supabase`) so both server and client components can reuse them.
