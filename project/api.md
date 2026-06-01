# API Endpoints — server routes

This document summarizes the server API endpoints located under `app/api/*`, handler signatures, expected payloads, and important behavior/security checks.

General conventions
- Route handlers export HTTP verb functions: `export async function GET(req: Request)`, `POST`, `PATCH`, etc.
- Server handlers use `utils/supabase/server.createClient()` for DB access and tenant-aware auth checks using `supabase.auth.getUser()`.

Notable endpoints

- `app/api/leads/[id]/route.ts` (PATCH)
  - Purpose: Update lead fields (status, website, industry, linkedin_url, company_details, ai_coach_state).
  - Handler: `export async function PATCH(request: Request, { params })`
  - Security: Verifies `supabase.auth.getUser()` exists and restricts update to `user_id`.
  - Returns: the updated lead row or 401/500 on error.

- `app/api/actions/route.ts` (GET, POST)
  - GET: `export async function GET(request: Request)` — fetches action logs by `lead_id` and optional filters (`type`, `stage`, `status`).
  - POST: `export async function POST(request: Request)` — inserts new action(s) into `actions` table and returns the created row(s).

- `app/api/signals/route.ts` (GET)
  - Purpose: Returns either an inbox-matched feed (profile-based) or a global search feed.
  - Handler: `export async function GET(req: Request)` — supports query params: `view`, `q`, `signal_types`, `sectors`, `event_categories`, `offset`, `limit`.
  - Security: Requires authenticated user for the inbox view; the search view can be public for global search.

- `app/api/iris/*` (AI orchestration)
  - `app/api/iris/generate/route.ts` (POST) — orchestrates AI generation using `IrisOrchestrator`, optionally calls `saveIrisDraft` and proxies to DeepSeek AI.
  - `app/api/iris/drafts/route.ts` — persists drafts via server action `saveIrisDraft`.
  - `app/api/iris/tasks/*` — PATCH/POST endpoints that call `app/actions/iris` helpers for task lifecycle (complete/approve/confirm).

Security & best practices
- Always check `supabase.auth.getUser()` and enforce `user_id` checks in queries to prevent cross-tenant access.
- Keep heavy AI calls (external API requests) isolated and protect keys with server environment variables (e.g., `DEEPSEEK_API_KEY`).
