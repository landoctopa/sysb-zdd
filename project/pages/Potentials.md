# Page: Potentials (`app/potentials/page.tsx`)

Path: `app/potentials/page.tsx`

Summary:
- Server page that lists user-specific potentials (promoted signals or user-saved signals).
- Requires authentication; fetches `user_signals` for the active user and renders `PotentialsClient`.

Key imports and dependencies:
- `createClient()` from `utils/supabase/server.ts` — server Supabase client.
- `redirect` from `next/navigation` to protect the page.
- `PotentialsClient` client component.
- `PageContainer` layout wrapper.

APIs used:
- Client components may call `/api/signals` and `/api/actions` as needed.

Notes:
- The page throws on fetch error to allow error boundary to catch build-time issues during SSR.
