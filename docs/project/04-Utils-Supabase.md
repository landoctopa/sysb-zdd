# Utils & Supabase — `lib` and `utils/supabase`

This document describes shared helpers in `lib/utils.ts` and Supabase client helpers in `utils/supabase`.

lib/utils.ts (common helpers)

- `cn(...classes)`
  - Purpose: Safe className composition.
  - Example: `cn('px-4', isActive && 'bg-blue-500')`.

- `formatDate(date)` and `timeAgo(date)`
  - Purpose: Human-friendly date formatting used across UI.

- `fetcher(url, opts)`
  - Purpose: Small wrapper used by SWR or client hooks for fetching.

utils/supabase/client.ts (browser)

- `supabaseClient` or `createBrowserSupabaseClient()`
  - Purpose: Preconfigured Supabase client for browser usage.
  - Exports: a client instance and small auth helpers:
    - `signInWithProvider(provider)`
    - `getUser()`

utils/supabase/server.ts (server)

- `createServerSupabaseClient(req?)`
  - Purpose: Returns a server-bound Supabase client using request cookies or service role key.

- `getSessionFromRequest(req)`
  - Purpose: Extract session info from cookies to identify the current user in server routes.

Security note

- Never expose service-role keys to the browser; keep them in server-only code and environment variables.

Testing and reuse

- Keep DB-access wrappers small and testable. Export named helpers for unit testing and import them into route handlers.
