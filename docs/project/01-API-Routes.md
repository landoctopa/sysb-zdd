# API Routes — sysb-dashboard

This file describes server endpoints present under `app/api/*`. Handlers follow the Next.js route convention and export HTTP verb functions (e.g., `GET`, `POST`) which accept the native `Request` and return a `Response` or `NextResponse`.

Common patterns

- Handler signature: `export async function POST(req: Request): Promise<Response>`
- Use `utils/supabase/server.ts` to run DB queries with server-side credentials.
- Keep validation and DB logic in helper functions inside the route file or in small service modules to make testing easier.

Leads routes (summary)

- `app/api/leads/confirm-company/route.ts`
  - Purpose: Confirm an enriched/discovered company for a lead.
  - Expected export(s):
    - `export async function POST(req: Request)` — Accepts `{ leadId, companyId }` and updates the lead record.
    - Helpers: `confirmCompanyForLead(leadId, companyId)`.

- `app/api/leads/discover-company/route.ts`
  - Purpose: Enrich company metadata from email or domain and attach it to a lead.
  - Expected export(s):
    - `export async function POST(req: Request)` — Accepts `{ leadId?, email?, domain? }`.
    - Helpers: `discoverCompanyFromEmail`, `persistCompanyDiscovery`.

- `app/api/leads/network/route.ts`
  - Purpose: Return network connections for a lead (colleagues, peers).
  - Expected export(s):
    - `export async function GET(req: Request)` — Query params: `leadId`, `limit`, `cursor`.
    - Helpers: `fetchLeadNetwork(leadId, opts)`.

- `app/api/leads/research/route.ts`
  - Purpose: Trigger research jobs and attach research outputs to a lead.
  - Expected export(s):
    - `export async function POST(req: Request)` — Accepts `{ leadId, actions }`.
    - Helpers: `enqueueResearchJob`.

Auth routes (summary)

- `app/api/auth/callback/route.ts`
  - Purpose: Handle OAuth provider callback, exchange code for tokens, and create a session.
  - Expected export(s):
    - `export async function GET(req: Request)` — Handles provider redirect with code; uses helpers like `exchangeCodeForToken` and `createSession`.

- `app/api/auth/signout/route.ts`
  - Purpose: Destroy session and clear cookies.
  - Expected export(s):
    - `export async function POST(req: Request)` or `GET(req: Request)` — Clears session and redirects to login.

Notes

- Where available, route modules will also export helper functions (validation, DB helpers). If you need those helpers exported for unit testing, consider adding named exports for them.
