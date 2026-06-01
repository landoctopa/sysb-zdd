# Page: Signals (`app/signals/page.tsx`)

Path: `app/signals/page.tsx`

Summary:
- Server page that renders the signal feed and protects access — redirects to `/login` if no authenticated user.
- Fetches optional user profile to tailor the feed and renders a client `SignalsClient` component.

Key imports and dependencies:
- `createClient()` from `utils/supabase/server.ts` — server Supabase client used for auth and profile fetch.
- `redirect` from `next/navigation` — used to send unauthenticated users to `/login`.
- `SignalsClient` (client component) — renders the signal feed and interacts with `/api/signals`.
- `PageContainer` layout wrapper.

API endpoints used:
- `/api/signals` (GET) — returns either an inbox-matched feed for user or a global search feed depending on query params (see `app/api/signals/route.ts`).

Notes:
- The server call fetches the user's profile (`profiles` table) and passes it to the client component so that UI preferences and filters can default to profile settings.
