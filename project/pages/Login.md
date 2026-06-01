# Page: Login (`app/login/page.tsx`)

Path: `app/login/page.tsx`

Summary:
- Client component rendering the login form and handling password sign-in using Supabase client.

Key imports and dependencies:
- `createClient()` from `utils/supabase/client.ts` — browser Supabase client used for `signInWithPassword` and `signOut`.
- `useRouter` from `next/navigation` for client navigation after sign-in.
- UI primitives: `Card`, `CardHeader`, `CardContent`, `Button`.

Key functions and behavior:
- `handleLogin` (inside component):
  - Calls `supabase.auth.signInWithPassword({ email, password })`.
  - On success, routes to `/` and calls `router.refresh()` to update server-state dependent UI.
  - On error, shows an alert with the error message.

Notes for maintainers:
- This page is client-only (`'use client'`) and uses the browser Supabase client. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in environment for local dev.
