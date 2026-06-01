# sysb-dashboard — Project Documentation (generated)

Location: `project/` (this folder)

This collection documents the codebase starting from pages, then enumerating the components, API endpoints, server actions, lib/utils, stores, and key types each page depends on. Files are organized so you can open the page documentation and follow its transitive dependencies (components → APIs → server helpers → utils → types).

Files in this folder:

- `pages/` — per-page docs (Home, Leads, Lead Workbench, Signals, Potentials, Login, Onboarding, Settings)
- `components.md` — components catalog and key exports
- `api.md` — API endpoints and handler signatures
- `server-actions.md` — server-side actions (app/actions)
- `lib.md` — shared libs and helpers (`lib/utils.ts`, `database.types.ts`)
- `supabase.md` — Supabase client/server helpers (`utils/supabase`)
- `stores.md` — client stores and store actions (`store/`)
- `types.md` — types summary and pointers to `database.types.ts`

How to use these docs:

- Start with the page you care about under `pages/` to see exactly which components and APIs it imports and uses.
- Follow the API and server-actions docs for payload shapes and key helper functions.
- If you want exact exported signatures inserted into these docs, run a repository-wide scan — I can do that and update the files.
