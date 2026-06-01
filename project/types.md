# Types

Primary canonical types live in `database.types.ts` at the project root. This file is generated to reflect the Supabase schema and contains a `Database` type exposing `public.Tables` row, insert and update shapes for every table.

How it's used:

- Components and stores import types like `Database['public']['Tables']['leads']['Row']` to derive typed `Lead` objects used in UI and server code.
- Example usage in codebase:
  - `type Lead = Database['public']['Tables']['leads']['Row']`
  - This guarantees fields like `id`, `company_name`, `ai_coach_state`, `status`, and timestamps are present and typed.

Recommendation:
- If you change the database, regenerate or update `database.types.ts` to maintain TypeScript safety.
