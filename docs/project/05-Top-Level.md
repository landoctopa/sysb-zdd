# Top-level files & next steps

This short document describes root-level files and suggested next steps for maintainers.

Root files

- `package.json` — scripts typically include `dev`, `build`, `start`, `lint`.
- `tsconfig.json` & `next-env.d.ts` — TypeScript configuration.
- `next.config.ts` — Next.js configuration (rewrites, env, image domains).
- `postcss.config.mjs` — PostCSS config used by the project.
- `eslint.config.mjs` — ESLint configuration.
- SQL files (`db.sql`, `restore_raw_signals.sql`, `restore_raw_signals_v2.sql`) — database snapshots or imports. Review before applying to any DB.
- `components.json`, `AGENTS.md`, `CLAUDE.md`, `Restructuring.md`, `sprints.md` — project metadata / notes.

Suggested next steps

1. Repo scan for exact exports
   - Run a code scan to replace "likely exports" with exact exported names and function signatures. I can do this for you and update all docs.

2. Add `docs/QUICKSTART.md`
   - Suggested contents: required env vars (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_URL` or similar), `pnpm`/`npm` install and `pnpm dev` instructions, local DB notes.

3. Add typed API contracts
   - Create `types/` for request/response payloads and reference them in route docs.

4. CI checks for docs
   - Add a lightweight script that verifies docs are present and up-to-date (optional).

If you'd like, I can now run a repository scan and replace inferred exports with exact symbols. Say "Scan repo and update docs" to proceed.
