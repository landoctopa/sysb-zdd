# Page: Home (`app/page.tsx`)

Path: `app/page.tsx`

Summary:
- Server component that renders the marketing/home dashboard and hero.
- Fetches the current Supabase user to decide whether to show a dashboard link or a trial CTA.

Key imports (used by this page):
- `createClient()` from `utils/supabase/server.ts` — obtains server Supabase client.
- UI primitives: `Button`, `Badge`, `Card`, `CardContent`, `CardHeader`, `CardTitle` from `components/ui/*`.
- `DemoMatch` from `components/landing/DemoMatch` — small interactive demo component.

Behavior & important code paths:
- Calls `createClient()` and `supabase.auth.getUser()` to get the active user. Used to route logged-in users to `/leads`.
- Renders marketing feature panels and the primary CTAs linking to `/leads`, `/login`, and `/signals`.

Dependencies:
- Components: `components/ui/*`, `components/landing/DemoMatch`
- Utilities: `utils/supabase/server.createClient` (server Supabase client)
- Types: `Metadata` from `next` (page metadata exported)

Notes for maintainers:
- Keep heavy data fetching out of this page; it's primarily static content mixed with a single user lookup to personalize CTA.
- Any change to the `Badge`/`Card` primitives will impact layout here — these are simple presentational components.
