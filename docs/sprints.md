### Sprint 1: Global Firehose (Backend)
- [ ] Migrate `raw_signals` to global schema (remove `user_id`, add `type`).
- [ ] Create `user_signals` table for permanent storage.
- [ ] Update Hono Worker to use "Neutral Summary" prompts (No User Context).
- [ ] Implement 30-day auto-delete for `raw_signals`.

### Sprint 2: The "Inbox" Experience (UI)
- [ ] Build `/signals` route with Attio-style high-density list.
- [ ] Implement TanStack Query for filtering and triage (Read/Dismiss).
- [ ] Build Mobile-responsive cards for signal previews.

### Sprint 3: Deep Research & Dossier
- [ ] Build `/signals/[id]` research page.
- [ ] Implement On-Demand AI generation (Dossier + Strategic Hook).
- [ ] Ensure research is saved to `user_signals` for permanence.

### Sprint 4: User Context & Website Extraction
- [ ] Build `/profile` for context management.
- [ ] Implement "Website-to-Profile" extractor (Scrape URL -> AI Draft Context).
- [ ] Link `feed_sources` management to the user profile.

### Sprint 5: Pipeline & Execution
- [ ] Build `/leads` pipeline view.
- [ ] Implement "Lead Promotion" logic (Signal -> Lead).
- [ ] Build `/leads/[id]` for contact management and outreach plays.