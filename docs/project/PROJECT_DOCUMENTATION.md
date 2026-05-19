# sysb-dashboard — Project Documentation

Date: 2026-05-18

## Purpose

This document provides a concise, developer-focused description of the `sysb-dashboard` application structure, HTTP routes, React components, utility modules, and (inferred) exported functions/types. Where exact symbols are not available, the file lists likely exports and example signatures typical for a Next.js + TypeScript project using Supabase.

---

## High-level structure

- `app/` — Next.js `app` router: pages, layout, and API routes.
- `components/ui/` — Reusable UI primitives (Buttons, Inputs, Table, etc.).
- `utils/supabase/` — Supabase clients and server helpers.
- `lib/` — Shared utilities (formatters, helpers).
- `public/` — Static assets.
- Root files — config, SQL dumps, project notes.

Refer to `docs/PROJECT_DESCRIPTION.md` for a shorter overview.

---

## API routes (server)

The app uses Next.js route files under `app/api/*` to implement server endpoints. The typical exported handlers are `GET`, `POST`, `PUT`, `DELETE` functions that accept the native `Request` object and return `Response` objects (or Next.js `NextResponse`). The implementations interact with Supabase via `utils/supabase/server.ts`.

Example route contract

- Handler signature (TypeScript):

  - `export async function POST(req: Request): Promise<Response>`

- Typical helper functions inside route modules:

  - `validatePayload(payload: any): {valid: boolean, errors?: string[]}`
  - `getLeadById(id: string)` — query DB for lead
  - `updateLead(id: string, changes: Partial<Lead>)`

Notable routes (inferred)

- `app/api/leads/confirm-company/route.ts`
  - Purpose: Mark a discovered/enriched company as confirmed for a lead.
  - Exports:
    - `export async function POST(req: Request): Promise<Response>` — body: `{ leadId: string, companyId: string }`.
    - Helpers: `confirmCompanyForLead(leadId, companyId)` which updates DB and returns result.

- `app/api/leads/discover-company/route.ts`
  - Purpose: Enrich or discover company metadata from lead email/domain.
  - Exports:
    - `export async function POST(req: Request): Promise<Response>` — body: `{ leadId?: string, email?: string, domain?: string }`.
    - Helpers: `discoverCompanyFromEmail(email)`, `persistCompanyDiscovery(leadId, company)`.

- `app/api/leads/network/route.ts`
  - Purpose: Return the network of connections for a lead (colleagues, peers).
  - Exports:
    - `export async function GET(req: Request): Promise<Response>` — accepts query params `?leadId=...&limit=...`.
    - Helpers: `fetchLeadNetwork(leadId, opts)`.

- `app/api/leads/research/route.ts`
  - Purpose: Trigger research background tasks or attach research notes.
  - Exports:
    - `export async function POST(req: Request): Promise<Response>` — payload: `{ leadId, actions }`.
    - Helpers: `enqueueResearchJob(leadId, params)`.

Auth routes (inferred)

- `app/api/auth/callback/route.ts`
  - Purpose: OAuth provider callback handling.
  - Exports:
    - `export async function GET(req: Request): Promise<Response>` — exchange code for token, create session.
    - Helpers: `exchangeCodeForToken(code)`, `createSessionForUser(user)`, `setAuthCookie(res, session)`.

- `app/api/auth/signout/route.ts`
  - Purpose: Invalidate session and clear cookies.
  - Exports:
    - `export async function POST(req: Request): Promise<Response>` or `GET` — clears session and redirects.
    - Helpers: `destroySession(sessionId)`.

Notes

- Many route modules also export small helper functions (not intended to be used externally) for validation and DB-access. If you prefer explicit exports for testing, export helpers individually and keep handlers as default/exports.

---

## Pages and client components

Pages live in `app/` and use a mix of server and client components. Client components are typically placed next to pages or in `components/` and use `"use client"` when necessary.

Key pages (inferred)

- `app/page.tsx`
  - Root dashboard page. Likely exports `export default function Page()` as a server component that renders main UI and fetches initial data.

- `app/login/page.tsx`
  - Login page; client component or server+client hybrid. Exports `export default function LoginPage()` and client handlers like `handleSubmit`.

- `app/leads/page.tsx`
  - Leads listing. Exports `export default async function Page()` which fetches leads server-side and renders `LeadsClient`.

- `app/leads/[id]/page.tsx`
  - Lead details route. Exports a server `Page({params})` which loads lead details and composes client components such as `LeadDetailClient`, `LeadNetworkClient`, and `LeadStatusSelector`.

Client components (inferred) — `app/leads`

- `LeadsClient.tsx`
  - Exports:
    - `export default function LeadsClient(props: { initialLeads?: Lead[] })` — renders list, search, filters.
    - Possibly `export function useLeads()` hook for client-side fetching.

- `LeadDetailClient.tsx`
  - Exports:
    - `export default function LeadDetailClient({ leadId }: { leadId: string })` — shows details, notes, actions.

- `LeadNetworkClient.tsx`
  - Exports:
    - `export default function LeadNetworkClient({ leadId }: { leadId: string })` — displays network graph/list.

- `LeadStatusSelector.tsx`
  - Exports:
    - `export default function LeadStatusSelector({ value, onChange }: { value: string; onChange: (s:string)=>void })` — status select component.

Explanation and examples

- Most components export a default React component and optionally named helpers (constants, small hooks).
- Prop types usually follow the pattern: `interface Props { ... }` followed by `export default function Component(props: Props) { ... }`.

---

## UI primitives (`components/ui`)

This folder provides design system primitives used across pages. Each file typically exports a component and related types or small helpers.

Common exports (inferred) and purpose

- `accordion.tsx`
  - Exports: `Accordion`, `AccordionItem`.
  - Purpose: Collapsible content sections used in settings or details views.

- `badge.tsx`
  - Exports: `Badge`.
  - Purpose: Small status indicators (e.g., lead status, tags).

- `button.tsx`
  - Exports: `Button`, `buttonVariants`.
  - Purpose: Unified button styles and variants (primary, ghost, destructive).

- `card.tsx`
  - Exports: `Card`, `CardHeader`, `CardBody`, `CardFooter`.
  - Purpose: Group related content with consistent spacing and shadow.

- `input.tsx`
  - Exports: `Input`, `Label`.
  - Purpose: Form inputs shared across login and lead-edit forms.

- `select.tsx`
  - Exports: `Select`, `Option`.
  - Purpose: Styled dropdowns.

- `separator.tsx` — `Separator` component for visual dividers.
- `skeleton.tsx` — `Skeleton` components for loading states.
- `sonner.tsx` — Toaster wrapper or re-exports for notifications.
- `table.tsx` — Table rendering primitives and helpers like `useTable`.
- `tabs.tsx` — Tabs primitives: `Tabs`, `TabList`, `TabPanel`.

Notes on usage

- Components are small and composable. Prefer reusing `Button`, `Input`, and `Card` for consistent UI.
- Use `cn` or `classNames` helper from `lib/utils.ts` when composing className values.

---

## Utilities (`lib/utils.ts`)

Common helpers (inferred):

- `cn(...args: Array<string|false|null|undefined>): string`
  - Purpose: Concatenate class names safely.
- `formatDate(date: string | Date): string`
  - Purpose: Format ISO dates to readable strings.
- `timeAgo(date: string|Date): string`
  - Purpose: Human-friendly relative time.
- `fetcher(url: string, opts?: RequestInit): Promise<any>`
  - Purpose: Small wrapper used by SWR or client hooks.

These helpers are imported across components and server code.

---

## Supabase helpers (`utils/supabase`)

Typical exports (inferred):

- `client.ts`
  - `export const supabaseClient` — preconfigured client for browser usage.
  - `signInWithProvider(provider: string)` — helper to kick off OAuth flows.

- `server.ts`
  - `export function createServerSupabaseClient(req?: Request)` — returns a server-bound Supabase client (service role or with cookies) for server routes.
  - `getSessionFromRequest(req: Request)` — helper to retrieve session/user from cookies.

Security note

- Keep service-role keys out of the client. Use server helpers and environment variables for privileged operations.

---

## Top-level files

- `package.json` — scripts and dependencies. Common scripts: `dev`, `build`, `start`, `lint`.
- `next.config.ts` — Next.js configuration; may include rewrites and environment variables.
- `tsconfig.json` and `next-env.d.ts` — TypeScript setup.
- `postcss.config.mjs` — PostCSS config for CSS processing.
- `eslint.config.mjs` — Linting rules.
- SQL files (`db.sql`, `restore_raw_signals*.sql`) — database snapshots or restore scripts.

---

## How to extend or verify exports

If you want the documentation to reflect exact exported names and signatures:

1. I can scan the repository and extract exports programmatically and update this doc.
2. Alternatively, provide access to the code that contains missing files and I will generate accurate typing and examples.

Commands I would run locally to verify and generate exact lists:

```bash
# list exported symbols with ripgrep + ts-node (example)
rg "export (default )?(function|const|async function|interface|type|class)" -n app components lib utils || true
```

---

## Next steps (optional)

- Run an automated export scan and replace inferred sections with exact exported symbols.
- Generate a `docs/QUICKSTART.md` with environment variables and local run instructions.
- Add typed interfaces for API request/response payloads in `types/` and link them from docs.

---

Generated by the project documentation generator on 2026-05-18. If you want me to run a repository scan to replace inferred signatures with exact ones, say "Scan repo and update docs" and I'll proceed.
