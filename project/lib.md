# Lib — shared helpers (`lib/`)

Key files:

- `lib/utils.ts`
  - Exports: `cn(...inputs)` — wraps `clsx` + `tailwind-merge` to safely merge Tailwind class lists.
  - Use: Utility used throughout components and layout helpers to compute className strings.

- `database.types.ts`
  - Exports: `Database` and derived row types for all tables (actions, leads, contacts, profiles, etc.).
  - Purpose: Provides strongly-typed access to DB rows for both client and server code. Many components use `Database['public']['Tables'][...]['Row']` to derive row types.

Notes:
- Keep `database.types.ts` in sync with Supabase/DB schema. It drives TypeScript safety across the app and is used by `store/*` for typed atoms.
