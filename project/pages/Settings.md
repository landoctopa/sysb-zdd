# Page: Settings (`app/settings/page.tsx`)

Path: `app/settings/page.tsx`

Summary:
- Client-side settings page that reads the `$profile` store and offers navigation to onboarding, integrations, billing, and security pages. Includes a sign-out flow.

Key imports and dependencies:
- `$profile` from `store/profileStore.ts` (react nanostore) for profile data.
- `createClient()` from `utils/supabase/client.ts` and `supabase.auth.signOut()` used by `handleSignOut`.
- `PageContainer` layout and UI primitives.

Key functions:
- `handleSignOut`: calls `supabase.auth.signOut()` and redirects the user to `/login` using `useRouter`.

Notes:
- This page is client-only and reads local store state; after sign-out the session cookie is cleared on the client and server routes will reflect unauthenticated state.
