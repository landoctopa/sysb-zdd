# Sales Management App

## Context

I have developing a sales management app for B2B businesses who are solopreneurs, small-mid sized businesses. The app mains to make sales easier for businesses with small teams. Below are how i have structured the app. 

### Role

You are an expert sales leader with years of experience with deals of all sizes and sectors


## Detailed Flow

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
7. **Lead Workbench (/leads/[id])** – central place to manage an active opportunity. yet to be completely implemented
   1. Components:
      1. WorkbenchHeader – stage selector, progress bar, hotness score, deal timeline.
      2. AICoachSection (Iris) – displays Iris’s next best action and action buttons (email, meeting, task, call script, proposal, question).
      3. StrategyCard – shows strategic analysis, trigger alignment, hurdles, business justification.
      4. ContactsManager – manage stakeholders.
      5. ActivityFeed – tasks and communications.
      6. Stage change (dropdown) calls updateLeadStatus (optimistic update) and triggers a new coach log (via API endpoint /api/leads/[id]/coach).

##### Key Tables & Relationships (Supabase)

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

## Sale Orchestration

## Stages of lead management

1. **new** : Qualify the lead (BANT: Budget, Authority, Need, Timeline)
   
   1. Activities
      
      1. Research company & signal
      
      2. Identify decision makers
      
      3. Initial outreach (email/call/linkedin)

2. **contacted**: Establish engagement, nurture, identify buying signals
   
   1. Activities
      
      1. Send follow-up emails
      
      2. Schedule a meeting/call
      
      3. Share case studies or content

3. **proposal**: Deliver a compelling, tailored proposal / SOW
   
   1. Activities
      
      1. Gather lead’s specific requirements
      
      2. Draft proposal (key points, pricing, timeline)
      
      3. Schedule proposal presentation

4. **negotiation**: Agree on terms, address objections, close
   
   1. Activities
      
      1. Discuss terms (price, scope, timeline)
      
      2. Overcome objections
      
      3. Finalise contract

5. **won/lost**: Officially win the deal, generate summary, handoff to delivery or Learn why and keep for future nurturing
   
   1. Activities
      
      1. Mark deal as closed‑won or lost
      
      2. Generate internal deal summary
      
      3. Create onboarding tasks
      
      4. Log reason for loss, Archive or flag for future re‑engagement


## Lead Orchestration (iris)
I want to manage have all the lead features managed through Iris. It would be done through a mix of AI, assist as well as preset templates and set actions. i have few files for iris integration but i have not built it inside of my project yet.

## Attachments
- Files for iris (templates, types, config)
   - 20250001_iris_orchestration.sql
   - condition-evaluator.ts
   - iris.actions.ts
   - IrisCoachSection.tsx
   - IrisFeedbackPrompt.tsx
   - leads.actions.ts
   - orchestrator.ts
   - playbook.config.ts
   - resources.config.ts
   - route.ts
   - StageAdvanceGate.tsx
   - template-utils.ts
   - types.ts
- Current lead routes and components
   - app/leads/[id]/ActivityFeed.tsx
   - app/leads/[id]/AddContactModal.tsx
   - app/leads/[id]/AICoachSection.tsx
   - app/leads/[id]/ContactsManager.tsx
   - app/leads/[id]/page.tsx
   - app/leads/[id]/StrategyCard.tsx
   - app/leads/[id]/WorkbenchHeader.tsx
- database types : database.types.ts

## Instruction

- understand the structure of the app with context. Routes, flow and features

- I have developed signals and potential routes and currently working on lead ochestration part

- I want AI assistant (iris) to be main and active part of orchestration every step of the lead management through guiding users, providing feedback, research and insight.  
  - i want to standardize iris intervention at every stage and in context to every task  
  - iris has access to user business profile, product offering, current lead details, tasks, etc

- i want the standardisation to address following
  - How to create tasks given the stage and context. for example if the user is in contacted stage and have sent a mail, how long should they wait for reply, what should they do when they don't get reply, what should be right channel to reach out to people in context of current lead. what should happen to prompt user to change status or which marks completion of a stage
  - How would i create standardize template which iris could use for tasks, input, generating text for communication, how to prompt user to get feedback on a task and decide completion. I want user to be active part and final call on things
- I have few idea for implementing iris (refer to attached files) guide me through this and evaluate my approach and provide alternatives


## Clarifications
1. Database & Schema
Have you already run the 20250001_iris_orchestration.sql migration in Supabase? If yes, what's the current state of the tasks table (does it have task_config_id, feedback_submitted, user_approved, etc.)?

Do you have the profiles table with columns like product_offering, company_name? If not, how do you store the user's business profile that Iris should use for personalisation?

What's the exact schema of your communications table? (I saw type, direction, content, subject – but need to know if it logs both inbound/outbound emails, calls, meetings.)

2. User & Business Profile
For AI generation (emails, proposals, etc.), what information about the user's company should Iris know? (e.g., product name, value proposition, case studies, pricing model, typical sales cycle length)

Do you have a place where the user defines their "ideal customer profile" or "product offering"? If not, we should add it to profiles.

3. Sales Process Details
What are the mandatory tasks in each stage? For example:

In new: Must we always research contacts? Must we always send a cold email? Or sometimes LinkedIn only?

In contacted: After a positive reply, do we immediately schedule a meeting or send more info?

In proposal: Who typically drafts the proposal – the user or Iris? Should Iris generate a draft first?

What are the common objections you face? (Budget, timing, competition, authority?) We'll need these for objection playbooks.

What are the exit criteria for each stage? (e.g., from new to contacted: "Outreach sent AND response logged" or "At least one decision-maker contact identified"?)

What channels do you typically use? (Email, LinkedIn, phone, SMS, WhatsApp?) Should Iris suggest channel based on lead data?

4. AI & Automation Preferences
Do you want Iris to automatically generate tasks when a stage is entered, or should the user trigger it manually?

For email drafting: Should Iris use the user's Gmail/Outlook or just copy to clipboard? Your route.ts returns JSON, not sending emails – that's fine. But do you need integration with Gmail API to send drafts?

Do you want automatic checkbacks (cron job) to nudge users after no activity? Or just manual refresh?

Should Iris ever auto-advance a stage if all exit criteria are met, or always require user confirmation?

5. Existing Code & Structure
Where are your lib/ folders? I see references to @/lib/iris/... – is that already created? If not, where should I place the Iris files (e.g., lib/iris/orchestrator.ts, lib/iris/condition-evaluator.ts, etc.)?

Do you have a lib/supabase/server.ts and client.ts? (I assume yes, since you use createClient.)

What UI component library are you using? (You have @/components/ui/button, card, etc. – is that shadcn/ui?)

6. Deployment & Environment
Will you run the cron job via Vercel Cron Jobs, Supabase pg_cron, or a separate service?

Do you have API keys for DeepSeek and Anthropic? (Your route.ts uses both, but you may only need one.)