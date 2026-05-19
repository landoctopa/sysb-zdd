# B2B Sales App
I am developing a b2b sales app for small to mid sized businesses and solopreneurs who either have small sales team or the founder/owner is managing sales themselves.

## Context
the entire system is structured into two parts
1. Listner/Signal Aggregator (completed and deployed): A lightweight hono cloudflare workers which read from different rss feed and api to aggregate new in raw_signals table (supabase)
2. Main User facing app (under testing, current app which we will work on): Main user facing app where users manage their sales. This is developed as nextjs app with supabase, tailwindcss v4, shadcn, nanostores, tanstack/react-query etc. 

## Main App
This nextjs app has been structured keeping in mind the logical flow of the lead through its lifecycle.  

### Detailed Flow

1. **Raw Signals** – ingested from RSS/APIs into raw_signals table (30‑day TTL).
2. **Signals Page (/signals)** – displays three tabs:
   1. Matched Signals (Company News) → actionable, creates potentials.
   2. Trends (Industry Trend + Regulatory/Government) → informative, not actionable.
   3. Events (Events/Meetups) → informative.
      A separate All Signals page (/signals/all) provides a global firehose with full filtering.
3. **Click on actionable signal** – calls server action copyRawToPotential(rawSignalId).
   1. Copies raw signal fields into user_signals.
   2. Calls DeepSeek API to generate strategic dossier (ai_dossier JSON).
   3. Stores dossier and match_score in the new potential.
   4. Redirects to /potentials/{id}.
4. **Potentials Page (/potentials)** – lists all user‑saved signals (status: new, promoted, dismissed).
   1. Supports manual addition via “Add Potential” button → createManualPotential action (also generates dossier).
5. **Potential Detail Page (/potentials/[id])** – displays the AI dossier (strategic analysis, triggers, hurdles, business justification, hotness score, estimated sales cycle).
   1. Buttons: Promote to Lead (calls promotePotential) or Dismiss (dismissPotential).
6. **Lead Creation** – promotePotential action:
   1. Copies all strategic fields from ai_dossier into the leads table.
   2. Creates an initial ai_coach_log with stage 'new'.
   3. Marks the potential as promoted.
   4. Redirects to lead workbench: /leads/{leadId}.
7. **Lead Page (/leads/)**: Lists all the leads
8. **Lead Workbench (/leads/[id])**: Lead management page with AI ochestration(called Iris) Details are below. 


### Key Tables & Relationships (Supabase)
- **`raw_signals`** – ephemeral feed, TTL 30 days.
- **`user_signals`** – persisted potentials.
  - Columns: `ai_dossier` (JSON), `match_score`, `status` (new/promoted/dismissed), `source` (raw/manual).
- **`leads`** – active opportunities.
  - Strategic fields copied from dossier: `strategic_analysis`, `trigger_alignment`, `strategic_hurdles`, `business_justification`, `deal_timeline`, `hotness_score`. 
  - `ai_coach_state` – JSON to store user answers to Iris questions.
- **`ai_coach_logs`** – history of Iris suggestions.
- **`tasks`** – user‑created tasks (linked to lead).
- **`communications`** – logged emails/calls/meetings.
- **`contacts`** – stakeholders. 


## Lead Workbench (`/leads/[id]`) - Iris Orchestration Summary

### Page Structure

The lead workbench is a server-rendered page that hydrates client-side stores and renders five main sections:

1. **Sticky Header** – navigation back to pipeline, lead company name, menu.
2. **WorkbenchHeader** – pipeline progress bar, stage selector (with Iris gate), fit score and deal timeline stats.
3. **IrisCoachSection** – AI sales coach messages, suggested actions, task list, feedback prompts.
4. **StrategyCard** – expandable strategic analysis (analysis, trigger alignment, hurdles, business justification).
5. **ContactsManager** – stakeholder management (add/edit contacts, email, LinkedIn, phone).
6. **ActivityFeed** – combined timeline of tasks and communications.

### Data Fetching (Server Component)

```tsx
// All data fetched in parallel using Supabase
const lead = await supabase.from('leads').select('*').eq('id', id).single();
const contacts = supabase.from('contacts').select('*').eq('lead_id', id);
const tasks = supabase.from('tasks').select('*').eq('lead_id', id);
const communications = supabase.from('communications').select('*').eq('lead_id', id);
const coachLogs = supabase.from('ai_coach_logs').select('*').eq('lead_id', id);
const profile = supabase.from('profiles').select('*').eq('id', lead.user_id).single();
```

All data is passed to LeadStoreHydrator, which populates nanostores:
- $activeLead
- $activeContacts
- $activeTasks
- $activeCommunications
- $activeCoachLogs
- $profile (via separate store)

## Iris Features
### 1. Playbook-Driven Stage Logic
The IRIS_PLAYBOOK config (in lib/iris/playbook.config.ts) defines every stage (new, contacted, proposal, negotiation, won, lost) with:
- Goal – short description shown in UI.
- Entry message – template + context fields → shown when lead enters stage.
- Tasks – each task has:
   - id, title (with {{placeholders}}), channel (email/linkedin/phone/meeting/internal/auto)
   - due_business_days, required, depends_on, iris_tip
   - channel_logic for auto channel (e.g., use LinkedIn if contact has URL)
   - ai_actions – list of AI generation actions (draft email, proposal, etc.)
   - feedback_prompt – questions shown after task completion (or on creation)
   - post_feedback_action – AI action triggered after feedback (e.g., objection playbook)
   - requires_user_approval, approval_message
   - completion_gate – condition to allow marking complete (e.g., feedback submitted)
- Checkback rules – conditions that trigger automatic nudges (e.g., no reply after 3 days)
- Exit criteria – conditions (evaluated against lead + coach_state) that must be true before advancing stage. Each criterion has a user‑friendly label.
- Exit blocked message – shown when not all criteria are met.

### 2. Stage Advance Gate
- Component: StageAdvanceGate.tsx
- Replaces a simple stage dropdown: shows pills for each stage.
- On click, calls getExitCriteriaResults server action → evaluates all exit criteria for current stage.
- Displays a popover listing:
   - ✅ passed criteria
   - ❌ missing criteria
   - Iris message (if any)
- User can either:
   - Cancel
   - Override & advance (if missing criteria) – moves stage anyway
   - Move to stage (if all passed) – confirms and advances
- After confirmation, calls updateLeadStatus server action (which updates DB, triggers stage entry, auto-creates suggested tasks, revalidates path).

### 3. Task Creation & Management
- On stage entry, the orchestrator (IrisOrchestrator.onStageEntry) generates an entry message and suggested tasks (not created yet).
- The server action updateLeadStatus then automatically creates those tasks using confirmAndCreateTasks (for now – future version may ask user confirmation).
- Tasks are stored in tasks table with fields:
   - task_config_id (links to playbook task ID)
   - stage, title, channel, due_date, required, iris_tip
   - status (pending/completed/skipped)
   - feedback_submitted, feedback_answers, feedback_saves_to
   - user_approved, auto_prompt, completed_at
- Tasks are filtered by current stage in IrisCoachSection.

### 4. Task Completion & Feedback
Each task row has:
- Completion checkbox – calls completeTaskOptimistic store action → checks completion_gate (server‑side) before marking complete.
- Approval button – for tasks requiring user approval (requires_user_approval). Calls approveTaskOptimistic.
- AI action buttons – e.g., “Draft email”. Calls /api/iris/generate with action_key and lead_id, displays generated content inline.
- Feedback trigger – “Iris has a quick question” button (if feedback_prompt exists). Expands to IrisFeedbackPrompt.
- IrisFeedbackPrompt renders questions one by one (single-select, multi-select, text input). Submits answers via submitFeedbackOptimistic → merges answers into lead.ai_coach_state at saves_to path, then runs post_feedback_action if defined.
- After feedback, the task’s feedback_submitted is set to true, unlocking any completion gate that depends on it.

### 5. AI Actions
- API route /api/iris/generate handles two patterns:
   - Client‑initiated: { action_key, lead_id } → fetches lead, creates orchestrator, calls runAiAction.
   - Orchestrator‑initiated: { system_prompt, context, output_format, model } → calls DeepSeek directly.
- Supported actions (from IRIS_RESOURCES.ai_actions):
   - Email/ LinkedIn drafts (outreach, follow‑up, meeting request, break‑up, value email, contract cover)
   - Phone script, meeting agenda, case study suggestion
   - Proposal draft generation, objection playbook, deal summary, onboarding checklist
- Each action defines system_prompt, context_fields (e.g., lead.company_name, coach_state.outreach.initial), and expected output_format (e.g., { subject, body }).

### 6. Checkback Cron Job
- Endpoint: /api/cron/iris-checkbacks (protected by CRON_SECRET).
- Scheduled via Supabase pg_cron: runs daily at 09:00 UTC.
- For each active lead (status new/contacted/proposal/negotiation):
   - Finds last activity date (from communications.occurred_at or lead.updated_at).
   - Calls orchestrator.evaluateCheckbacks(lastActivityDate) → checks checkback_rules for current stage.
   - If a rule triggers (e.g., no reply after 3 days), inserts a new ai_coach_log with type checkback, message, and suggested actions.
- Cron job also logs results and errors.

### 7. Store Optimistic Updates
- Nanostores ($activeLead, $activeTasks, etc.) are used for reactive UI.
- All Iris actions have corresponding optimistic store actions:
   - completeTaskOptimistic – immediately marks task as completed, rolls back on error.
   - approveTaskOptimistic – sets user_approved optimistically.
   - submitFeedbackOptimistic – sets feedback_submitted optimistically.
   - confirmStageTasksOptimistic – adds new tasks to store optimistically.
   - updateLeadStatus – updates lead status in store, calls server action, rolls back on failure.

### 8. Condition Evaluator (Safe Expression Parser)
- condition-evaluator.ts evaluates playbook conditions without eval().
- Supports:
   - Dot‑path access: lead.contacts.length > 0
   - Comparisons: ===, !==, >=, <=, >, <
   - Logical && and || (with proper string/arrow function awareness)
   - Array .some() shorthand: lead.contacts.some(c => c.is_decision_maker === true)
   - Negation: !coach_state.contract_signed
- Used for exit criteria, completion gates, channel logic overrides, and checkback conditions.

### 9. Template Interpolation & Business Days
- template-utils.ts provides:
   - interpolateTemplate – replaces {{lead.company_name}} placeholders using resolvePath.
   - addBusinessDays – adds business days (Mon‑Fri) to a date (for task due dates).
   - businessDaysBetween – counts business days between two dates (for checkbacks).
   - isPast, formatDueDate – for UI display.

### 10. Data Model (supabase)
- leads – core opportunity fields + ai_coach_state (JSONB) accumulating user answers.
- tasks – Iris‑managed tasks with all columns needed for playbook integration.
- ai_coach_logs – all Iris messages (entry, checkback, post‑feedback, task_unlocked).
- contacts – stakeholders (name, role, email, LinkedIn, phone, decision maker flag).
- communications – logged emails/calls/meetings (channel, direction, subject, body, occurred_at).


## Instructions
- Go through the documentation markdown files attached first and then i will share code files once you get a idea of the project
- I need to trouble shoot certain parts of the project and refine implementation. I will share related files, pages, component, api routes/actions then 
- Let me after going through the docs if you are clear about the project and ask for clarifications if you need it. 