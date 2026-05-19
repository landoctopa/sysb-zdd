# Overview — sysb-dashboard

Date: 2026-05-18

Purpose

This document provides a short summary of the application's purpose and its top-level structure. The `sysb-dashboard` is a Next.js (app-router) TypeScript web application for managing and researching leads. It exposes API routes for lead operations, client pages for viewing and editing leads, and a small design system of UI primitives.

High-level structure

- `app/` — Next.js pages and API routes.
- `components/ui/` — UI primitives (Buttons, Inputs, Table, Tabs, etc.).
- `lib/` — Shared utilities (formatters, classNames, fetch wrappers).
- `utils/supabase/` — Supabase clients and server helpers for auth and DB access.
- `public/` — Static assets.
- Root files — `package.json`, `tsconfig.json`, `next.config.ts`, SQL snapshots, and project notes.

Guiding principles

- Keep server logic in `app/api/*` route files.
- Use server components for initial data fetch and client components for interactive UI.
- Centralize DB and auth interaction in `utils/supabase/*`.
