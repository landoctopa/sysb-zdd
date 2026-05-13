# Lead Workbench – Implementation Plan
I want to implement this set of feature in my current sales app which is designed for small businesses and solopreneurs. App aims to help users identify leads from signals, evaluate them and manage them as leads till the time of conversion. App is built with nextjs, supabase, tabstack query, nanostore, tailwind v4 and shadcn. 

Instructions:
1. I have base pages and feature components in place but its missing lots of things. 
2. Lets implement one feature at a time when we have clarity on how users are going to use it and if its essential
3. I will provide you with all the files (pages, api endpoints, nanostore, database schema/types)
Ask me for clarifications


## Overview
Transform the current lead workbench into a full guided‑selling platform for solopreneurs.  
All external integrations stay simple (copy‑paste, mailto/calendar URLs).  
The AI coach becomes the central orchestrator, suggesting precise next actions based on real‑time lead context.

---

## 1. Database Schema Changes

### 1.1 `contacts`
Add email column.
```sql
ALTER TABLE contacts ADD COLUMN email text;
```
### 1.2 ai_coach_logs

```sql
ALTER TABLE ai_coach_logs 
  ADD COLUMN action_type text,
  ADD COLUMN action_payload jsonb,
  ADD COLUMN context_snapshot jsonb;

```
Possible **action_type** values: email, meeting, call_script, task, proposal, none

### 1.3 Leads

Add proposal tracking.

```sql
ALTER TABLE leads ADD COLUMN proposal_generated boolean DEFAULT false;
```

### 1.4 tasks
Add optional end time for calendar links.

```sql
ALTER TABLE tasks ADD COLUMN end_date timestamptz;
```

## 2. Backend – New Utilities & Endpoints

### 2.1 Context Builder Function
Creates a detailed context object for a given lead.

```ts
// getLeadContext(leadId) returns:
{
  lead: {                  // all lead fields
    company_name, country, event_category, status, hotness_score,
    deal_timeline, strategic_analysis, trigger_alignment,
    strategic_hurdles, business_justification, proposal_generated
  },
  communications: {
    total: 5,
    by_type: { email: 3, call: 1, meeting: 1 },
    recent: [ { type, subject, date }, ... ]
  },
  tasks: {
    total: 8,
    completed: 3,
    pending: 5,
    next_due_date: '2025-06-15'
  },
  contacts: {
    total: 2,
    with_email: 1,
    list: [ { id, name, title, email } ]
  },
  recent_activity: [ ... ]  // last 5 events (tasks/comms)
}
```

### 2.2 Coach Insight Endpoint

POST /api/leads/[id]/coach
- Fetch context via getLeadContext(leadId).
- Build enriched prompt (see §4) and call DeepSeek API.
- Parse structured JSON response.
- Insert new row into ai_coach_logs with insight, action_type, action_payload, - context_snapshot.
- Return the new log entry.

Trigger points for coach generation:
- Promotion (existing POST /api/signals/action): after creating lead, generate first - log with action_type = 'email'.
- Stage change (client calls endpoint after status update).
- Manual refresh (button in UI).
- Task completion (optional – can be a manual refresh for now).


### 2.3 URL Helper Functions
Pure helpers, usable server/client side.

```ts
// Gmail compose URL
function buildGmailUrl(to, subject, body) {
  const params = new URLSearchParams({
    view: 'cm', fs: '1',
    to, su: subject, body
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

// Google Calendar add event
function buildGoogleCalendarUrl(title, startDate, endDate, details, location = '') {
  const format = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dates = `${format(startDate)}/${format(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

### 2.4 Simple .ics Endpoint (optional, future)
GET /api/tasks/[id]/calendar.ics 
- returns a file with task details.
- For MVP, Google Calendar link is sufficient.

### 2.5 Proposal Generation 

POST /api/leads/[id]/proposal

- Uses lead context + user profile (offerings, past projects).
- Generates a one‑pager via DeepSeek.
- Saves draft in a proposals table (or marks leads.proposal_generated = true and stores draft text in a coach log).

## 3. Frontend Components & Enhancements

### 3.1 ContactsManager

- Add an Add Person modal (form: name, title, email, LinkedIn URL, label).
- Mail icon: if contact has email → window.open(buildGmailUrl(email, '', '')); else prompt to add email.

### 3.2 AICoachSection
- Read latest ai_coach_logs via $activeCoachLogs.
- Based on action_type render:
    - email: “Open in Gmail” button (pre‑filled from action_payload) + “Copy email text”.
    - meeting: “Add to Calendar” button (Google Calendar link) + “Copy details”.
    - call_script: collapsible script area + “Copy script”.
    - task: “Create Task” button → opens quick task form with pre‑filled values, then saves.
    - proposal: “Generate Proposal” button (calls proposal endpoint) or “View Proposal” if already generated.
- Refresh button: calls POST /api/leads/[id]/coach and invalidates store.

### 3.3 ActivityFeed
- For each pending task: add a small calendar icon → opens Google Calendar link using task’s due_date + end_date (or due_date + 1h). Use buildGoogleCalendarUrl.
- For email communications: optional “Re‑open in Gmail” link.

### 3.4 StrategyCard
- Add CopyButton for “Business Justification”, “Strategic Analysis”, etc.

### 3.5 Quick Action Modals (Floating Bar)
Implement three dialogs triggered from the bottom bar buttons:

**Log Call**
- Fields: contact (dropdown from lead’s contacts), direction (inbound/outbound), notes, duration.
- Saves to communications table.

**Draft Email**
- Fields: to (contact selector or free text), subject, body.
- On save: insert communication (type email) and optionally update coach.

**Add Task**
- Fields: title, description, due date, end date, contact (optional).
- Saves to tasks table.


3## .6 CopyButton Component
```tsx
<CopyButton text={content}>
  <ClipboardIcon className="h-4 w-4" />
</CopyButton>
```
Uses navigator.clipboard.writeText() with a temporary “Copied!” tooltip.

## 3.7 Stage Change Coach Trigger
In WorkbenchHeader, after updateLeadStatus succeeds, call fetch(/api/leads/[id]/coach) and update the store with the new coach log.

## 3.8 Proposal UI
- Button in AICoachSection when action_type = 'proposal'.
- Shows generated text in a modal.
- Actions: “Copy to clipboard”, “Open in Google Docs” (via https://docs.google.com/document/create?title=..., then user pastes).

## 4. AI Coach Prompt Template

```text
You are an expert B2B sales coach for a solopreneur.  
Current lead state:
- Stage: {{lead.status}}
- Company: {{lead.company_name}}, {{lead.country}}
- Event: {{lead.event_category}}, Hotness: {{lead.hotness_score}}/100
- Timeline: {{lead.deal_timeline}}

Strategic analysis:
- Analysis: {{lead.strategic_analysis}}
- Trigger: {{lead.trigger_alignment}}
- Hurdles: {{lead.strategic_hurdles}}
- Justification: {{lead.business_justification}}

Progress:
- Communications sent: {{communications.total}} ({{communications.by_type}})
- Tasks: {{tasks.completed}}/{{tasks.total}} completed. Next due: {{tasks.next_due_date}}
- Contacts: {{contacts.total}} ({{contacts.with_email}} have email)
- Proposal drafted: {{lead.proposal_generated ? 'Yes' : 'No'}}

Recent activity: {{recent_activity}}

Based on this, suggest ONE concrete next action that moves the deal forward.  
Output strict JSON:
{
  "insight": "string",
  "action_type": "email|meeting|call_script|task|proposal|none",
  "action_payload": { ... }  // see payload specs per type
}
Payload examples:
- email: { "contact_id": "uuid", "subject": "...", "body": "..." }
- meeting: { "title": "...", "start_datetime": "ISO", "duration_minutes": 30, "agenda": "..." }
- task: { "title": "...", "description": "...", "suggested_due_date": "ISO" }
- call_script: { "script": "...", "objective": "..." }
- proposal: { "key_points": ["..."] }
```

## 5. Interaction Flows
### 5.1 From Signal to First Action
1. User promotes a signal → lead created, first ai_coach_logs row with action_type = 'email' (if contacts exist).
2. Workbench opens → AICoachSection displays “Send introduction email to [contact]”.
3. User clicks “Open in Gmail” → pre‑filled compose window.

### 5.2 Stage Progression
1. User changes stage via WorkbenchHeader.
2. updateLeadStatus updates DB and then calls POST /api/leads/[id]/coach.
3. Coach processes new stage + latest activity and returns new action.
4. UI refreshes with fresh recommendation.

5.3 Manual Communication / Task Logging
1. User taps “Log Call” or “Add Task” in floating bar → modal opens.
2. Form filled and submitted → data saved, activity feed updates.
3. Optionally user manually refreshes coach.

### 5.4 Daily Coach Check‑in (future)
- Cron job runs daily for all active leads → calls coach endpoint and stores new logs.
- Users see “Coach has new advice” badge when they open the workbench.

## 6. Implementation Priority
Phase 1 – Core (MVP): 
1. Database migrations (contacts.email, coach logs fields, leads.proposal_generated).
2. Context builder + coach endpoint.
3. Prompt template + DeepSeek call.
4. AICoachSection action buttons (email, calendar, task).
5. Gmail/Calendar URL helpers.
6. ContactsManager email field + mail icon.
7. Stage change triggers coach (WorkbenchHeader).
8. Manual refresh button.

Phase 2 – Interaction polish: 
9. Quick action modals (Log Call, Draft Email, Add Task).
10. CopyButton component + StrategyCard copy buttons.
11. ActivityFeed calendar icons.
12. Coach auto‑refresh after task completion (optional).

Phase 3 – Deepening features
13. Proposal generation endpoint + UI.
14. .ics download.
15. LinkedIn URL paste enrichment (manual still, but with profile preview maybe).
16. Daily cron for coach updates (for premium users).