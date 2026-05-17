
## Clarifications
1. Database & Schema
**Have you already run the 20250001_iris_orchestration.sql migration in Supabase? If yes, what's the current state of the tasks table (does it have task_config_id, feedback_submitted, user_approved, etc.)?**
- No, I have not run anything yet. all the files which were connected to iris are outside of the project so far. Following files are outside project->\
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

**Do you have the profiles table with columns like product_offering, company_name? If not, how do you store the user's business profile that Iris should use for personalisation?**
yes i am storing user business profile in profiles table, i have marked it below with comment "important for iris"

```ts
profiles: {
    Row: {
        address: string | null
        description: string | null
        full_name: string | null
        id: string
        ideal_customer_profile: Json | null // important for iris
        is_premium: boolean | null
        lead_quota_monthly: number | null
        offerings: Json | null // important for iris
        past_projects: Json | null  // important for iris
        sync_frequency_hours: number | null
        target_countries: string[] | null  // important for iris
        target_event_categories: string[] | null   // important for iris
        target_sectors: string[] | null  // important for iris
        updated_at: string | null
        website: string | null
    }
}

```

**What's the exact schema of your communications table? (I saw type, direction, content, subject – but need to know if it logs both inbound/outbound emails, calls, meetings.)**
user dont send communication from app directly, they use their prefered tools for tasks, emails, accounting, presentations etc. we provide text and guidance. to make it easier i have given few url helpers so far. I am looking to have deep integration for external tools further in future if mvp succeeds 
```ts
export function buildGmailUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  details: string,
  location = ''
): string {
  const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dates = `${format(startDate)}/${format(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

2. User & Business Profile
**For AI generation (emails, proposals, etc.), what information about the user's company should Iris know? (e.g., product name, value proposition, case studies, pricing model, typical sales cycle length)**
- everything in user profiles table, refer to first question above.

**Do you have a place where the user defines their "ideal customer profile" or "product offering"? If not, we should add it to profiles.**
- everything in user profiles table, refer to first question above.

3. Sales Process Details
**What are the mandatory tasks in each stage? For example:**

Every step does have few mandatory steps, we have to think about doneness for every step what a user must do to complete current step. they can do it externally and when prompted by iris provide input (which is most cases should be yes no or datetime) to keep things very managebale. We will have to think through every stage in depth.



4. AI & Automation Preferences
**Do you want Iris to automatically generate tasks when a stage is entered, or should the user trigger it manually?**
- iris can generate a prompt showing use what the next task is and if user clicks ok iris should create the task. I want most interaction between iris and user to be like that. Keep the user in the loop always 

**For email drafting: Should Iris use the user's Gmail/Outlook or just copy to clipboard? Your route.ts returns JSON, not sending emails – that's fine. But do you need integration with Gmail API to send drafts?**
- : i am using gmail link generation for now. 

**Do you want automatic checkbacks (cron job) to nudge users after no activity? Or just manual refresh?**
- after cron job and scheduled job and when tasks should be completed iris should check back automatically

**Should Iris ever auto-advance a stage if all exit criteria are met, or always require user confirmation?**
- there is no way for iris to know if a exit criteria is met because iris/app is not integrated with other tools where user executes, so when user logs in iris should check with user for all pending tasks. and if tasks determine lead advances to next stage then it shoul,intimate user and wait for an ok to advance.

5. Existing Code & Structure
Where are your lib/ folders? I see references to @/lib/iris/... – is that already created? If not, where should I place the Iris files (e.g., lib/iris/orchestrator.ts, lib/iris/condition-evaluator.ts, etc.)? 
- no i have not moved any of iris file to my project yet, I was only tinkering with idea outside of the app. 

Do you have a lib/supabase/server.ts and client.ts? (I assume yes, since you use createClient.)
- yes i have both server and browser client
    - utils/supabase/server.ts
    - utils/supabase/client.ts

What UI component library are you using? (You have @/components/ui/button, card, etc. – is that shadcn/ui?)
- shadcn with tailwindcss version 4

6. Deployment & Environment
Will you run the cron job via Vercel Cron Jobs, Supabase pg_cron, or a separate service?
- For now I will perfer to have it on supabase.

Do you have API keys for DeepSeek and Anthropic? (Your route.ts uses both, but you may only need one.)
- I am using deepseek, ignore anthropic i am not using it at all in project.