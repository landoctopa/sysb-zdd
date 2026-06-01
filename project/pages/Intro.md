# B2B Sales app for Small businesses

## Overview
- The Mission: The platform (named Iris AI) is an intelligent, agent-led CRM and sales acceleration workspace
- The Goal: Instead of forcing the user to cold-browse databases or write generic templates, the app monitors market trends to automatically flag high-intent sales triggers (like a company closing a Series B funding round), unrolls an operational playbook, and generates highly targeted outreach using elite copywriting principles.

### How the App Gets Data (Acquisition Lifecycle)
- Raw Signal Ingestion: The application continuously monitors and ingests structured or semi-structured data from market intelligence web scrapers, data apps, or news aggregators into a centralized database table named raw_signals.
- The Opportunity Trigger: Each signal represents a real-world commercial catalyst. Examples include executive leadership shifts, corporate expansions, or major funding rounds.
- Internal Structural Profiles: The system matches these events against a pre-configured User Business Profile containing the user’s exact service offerings, successful track records, and Ideal Customer Profile (ICP) parameters.

### Moving from raw_signals to Managing Leads
-The transition from a raw external data event to an active, accelerated sales deal follows a structured promotion path:
- AI Evaluation (The Briefing): When a raw signal is captured, an automated strategic analysis evaluates its "hotness score" (1-100), trigger alignment, business justification, and potential hurdles against your business profile.
- Lead Promotion: If the user approves the opportunity, they "promote" the signal. This action moves the record out of the passive signal stream and creates a permanent deal file in the leads table, initializing its status directly to discovery.
- Playbook Initialization: The second a lead lands in the discovery stage, the server initializes the IRIS_PLAYBOOK task architecture. It generates a structured action timeline in the actions database table, creating sequential, dependent checklists (e.g., verifying web domains, mapping buying personas, and unlocking Iris copywriting drafts).
- Active Pipeline Movement: The lead is managed inside the main workbench, progressing linearly through active tracks (discovery $\rightarrow$ engaged $\rightarrow$ solution_fit $\rightarrow$ proposal $\rightarrow$ negotiation $\rightarrow$ close) as completion gates are checked off, culminating in a binary logging event that archives the file as a terminal won or lost portfolio.

## The Technology Stack
- Framework: Next.js (App Router) utilizing React Server Components (RSC) for optimized initial data loading, combined with Client Components for interactive workspace panels.
- Database & Auth: Supabase (PostgreSQL) acting as the relational storage layer. It enforces data validation using native database enums and triggers, with Row Level Security (RLS) keeping user accounts isolated.
- State Management: NanoStores (store/leadsStore.ts) providing a highly atomic, reactive client-side store. This approach prevents full-page React re-renders while coordinating background synchronization and state updates across different widgets.  
- AI Orchestration Engine: DeepSeek/LLM integration executed via a Direct API Path (Pattern 2). This model maps custom system skill files directly to payload objects, bypassing heavy orchestration middleware.

## Route Architecture
The application layout is split into two primary operational views:

app/
├── leads/
│   ├── page.tsx                 # Server Page: Fetches all opportunities from database[cite: 6].
│   ├── PipelineView.tsx         # Client Tab View: The 6-stage sales pipeline & archive filters[cite: 5].
│   └── [id]/
│       ├── page.tsx             # Server Page: Validates lead ID, handles background signal sync.
│       └── LeadWorkbenchClient.tsx # Client Shell: Manages active tabs and dynamic step rendering.
└── api/
    ├── leads/[id]/
    │   ├── tasks/route.ts       # Synced Playbook task retrieval.
    │   └── status/route.ts      # Manual pipeline status overrides.
    └── iris/
        ├── generate/route.ts    # Pattern 2 Direct LLM skill execution path.
        └── tasks/complete/      # Server-side validation of playbook task gates.

## How Data Moves Around (Data Flow Matrix)
1. Signal Promotion to Lead Generation
    - A raw market event is detected and captured inside the database (raw_signals).
    - Promoting a target copies the foundational company metadata into the leads table, initializing its status to 'discovery'.  
    - When app/leads/[id]/page.tsx mounts, a server-side routine reviews raw database logs for overlapping company names, merging background market highlights directly into the lead's active ai_coach_state array.
2. The Server-to-Client Hydration Sequence
    - Database-First Fetch: When navigating to an individual account, the server page pulls the leads row, corresponding actions ledger rows, and associated relationship contact profiles from Supabase.
    - NanoStore Hydration: These server-fetched arrays are passed down to the LeadWorkbenchClient, setting global atoms like $activeLead and $activeTasks.  
    - Dynamic Workspace Rendering: The layout reads the lead's current status string. If status === 'discovery', it loads the DiscoveryStageWorkspace component[cite: 12]. This workspace iterates through the generated actions list, matching individual tasks against your configured playbook IDs (e.g., send_first_outreach). 
3. AI Execution & Cross-Step Context Splicing (Step 4 Outreach Example)
    - When you select a channel tab and click "Draft Message with Iris AI," the component reads data backwards through the active stores.
    - It captures the user's manual review inputs (spin_framework notes) and the prioritized contact maps generated during Step 3 (pre_outreach_prep), packaging them into a single context payload.
    - This compiled context is sent to the /api/iris/generate endpoint alongside the specific copywriting skill parameters.
    - The backend pipes this structured bundle directly to the LLM. The resulting message response is captured and updated in the database via a PATCH request to the action row's metadata[cite: 7].
    - The NanoStore catches the database change, triggering a targeted UI re-render that displays the personalized outreach copy on the screen without forcing a browser refresh.
4.  Playbook Gate Validation & State Transition
    - Clicking "Confirm Message Has Been Sent" triggers the completeTaskOptimistic function inside the store.  
    - The client hands validation off to the server route /api/iris/tasks/complete[cite: 7]. The backend verifies that the specified completion_gate condition is met (e.g., confirming message_sent === true).  
    - Once validated, the server recalculates your task stack, pushes newly unlocked steps into the database actions table, and refreshes the client store view[cite: 7].


## Current Work In Progress
1. Core Pipeline Architecture & Decision Matrix
    - The Problem Identified: Treating "Won" and "Lost" as linear stages inside a 13-part pipeline was creating data clutter, breaking onboarding workflows, and skewing operational charts.
    - The Solution Established: We streamlined the lifecycle down to an absolute set of 8 core states, separating progressive milestones from terminal data outcomes:
        - Active Linear Tracks (6 Stages): discovery $\rightarrow$ engaged $\rightarrow$ solution_fit $\rightarrow$ proposal $\rightarrow$ negotiation $\rightarrow$ close.
        - Terminal Archive Outcomes (2 States): won and lost.
    - Integrated Closing Framework: The post_close phase was removed as a top-level pipeline tab and folded directly inside the close workspace step. If a deal is flagged as won, a conditional gate unrolls an embedded account summary handover and onboarding checklist right inside the closing view; if flagged as lost, the file auto-archives.

2. Codebase Refactors Completed
- lib/skills/outreach-copywriting-generation.ts: Upgraded into an advanced copywriter prompt incorporating your core sales outreach principles (brevity under 100 words, prospect-centric language over volume, value before a low-friction binary question ask, and short subject lines).
- components/leads/discovery/Step4SendOutreach.tsx: Re-architected via Pattern 2 (Direct LLM path). It parses previous step data structures (the spin_framework notes and priority target rankings from step 3) to prompt DeepSeek, caching personalized email or LinkedIn copy directly inside the task metadata row without orchestration blocks.
- app/leads/PipelineView.tsx: Reconfigured to map exactly to the 8 production states, dividing active pipeline meters smoothly from split terminal archive counts (won / lost).
- app/leads/[id]/LeadWorkbenchClient.tsx: Re-aligned step blocks to cleanly load dynamic conditional workspaces across our 6 real steps while protecting terminal states with safe container boundaries.

3. Next Steps Checklist for the New Chat
When initializing the next session, jump straight into validating and updating these remaining pipeline-linked blocks:
[ ] Update components/leads/PipelineHeader.tsx to ensure its horizontal chevron indicator track perfectly maps the active stages: discovery, engaged, solution_fit, proposal, negotiation, close.
[ ] Verify the type definitions and state-transition helper actions inside store/leadsStore.ts align with the new 8-value lead_status enum map.
[ ] Test the end-to-end transaction loop inside the close workflow step to verify the dynamic unpacking of the post-close onboarding sheet.