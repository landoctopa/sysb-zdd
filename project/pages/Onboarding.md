# Page: Onboarding (`app/onboarding/page.tsx`)

Path: `app/onboarding/page.tsx`

Summary:
- Client-side onboarding form that collects business profile fields and updates `profiles` via Supabase client.

Key imports and dependencies:
- `createClient()` from `utils/supabase/client.ts` — browser Supabase client for `auth.getUser()` and `profiles.update`.
- `useStore` from `@nanostores/react` and `$profile` from `store/profileStore.ts` to update local client state.
- `toast` from `sonner` for user feedback.

Key functions and behavior:
- `handleSubmit` (inside component):
  - Validates current user with `supabase.auth.getUser()`.
  - Calls `supabase.from('profiles').update({...}).eq('id', user.id)` to store profile fields.
  - Updates the `$profile` nanostore and redirects to `/leads` on success.

Notes:
- This page writes to the `profiles` table and updates client state; ensure correct RBAC and column names when migrating profile schema.
