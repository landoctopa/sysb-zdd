## Detailed Flow

1. Raw Signals – ingested from RSS/APIs into raw_signals table (30‑day TTL).
2. Signals Page (/signals) – displays three tabs:

Matched Signals (Company News) → actionable, creates potentials.

Trends (Industry Trend + Regulatory/Government) → informative, not actionable.

Events (Events/Meetups) → informative.
A separate All Signals page (/signals/all) provides a global firehose with full filtering.

Click on actionable signal – calls server action copyRawToPotential(rawSignalId).

Copies raw signal fields into user_signals.

Calls DeepSeek API to generate strategic dossier (ai_dossier JSON).

Stores dossier and match_score in the new potential.

Redirects to /potentials/{id}.

Potentials Page (/potentials) – lists all user‑saved signals (status: new, promoted, dismissed).

Supports manual addition via “Add Potential” button → createManualPotential action (also generates dossier).

Potential Detail Page (/potentials/[id]) – displays the AI dossier (strategic analysis, triggers, hurdles, business justification, hotness score, estimated sales cycle).

Buttons: Promote to Lead (calls promotePotential) or Dismiss (dismissPotential).

Lead Creation – promotePotential action:

Copies all strategic fields from ai_dossier into the leads table.

Creates an initial ai_coach_log with stage 'new'.

Marks the potential as promoted.

Redirects to lead workbench: /leads/{leadId}.

Lead Workbench (/leads/[id]) – central place to manage an active opportunity.

Components:

WorkbenchHeader – stage selector, progress bar, hotness score, deal timeline.

AICoachSection – displays Iris’s next best action and action buttons (email, meeting, task, call script, proposal, question).

StrategyCard – shows strategic analysis, trigger alignment, hurdles, business justification.

ContactsManager – manage stakeholders.

ActivityFeed – tasks and communications.

Stage change (dropdown) calls updateLeadStatus (optimistic update) and triggers a new coach log (via API endpoint /api/leads/[id]/coach).