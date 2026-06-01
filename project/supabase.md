# Supabase helpers — `utils/supabase`

This project uses `@supabase/ssr` helpers to create server and browser clients.

Files:

- `utils/supabase/server.ts`
  - Exports: `export async function createClient()`
  - Purpose: Creates a server-side Supabase client using `createServerClient` from `@supabase/ssr` and wires `next/headers` cookies to the client so session cookies work correctly in Server Components and API routes.
  - Behavior: Uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (note: service-role key should be used carefully elsewhere).

- `utils/supabase/client.ts`
  - Exports: `export const createClient()` (browser factory)
  - Purpose: Creates a browser Supabase client via `createBrowserClient` and reads `NEXT_PUBLIC_SUPABASE_*` env vars.

Security notes:

- Do not leak service-role keys to the client; keep privileged operations on server routes and use `createClient()` from `server.ts` in server components and API routes.

Usage:

- Server pages call `const supabase = await createClient()` to run queries as the server-side session user.
- Client pages/components call `const supabase = createClient()` from `utils/supabase/client.ts` for browser-side auth flows.
