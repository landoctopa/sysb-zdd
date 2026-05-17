/**
 * /lib/iris/resources.config.ts
 *
 * AI action definitions and message templates for Iris.
 * Referenced by playbook.config.ts.
 */

import type { IrisResources } from './types';

export const IRIS_RESOURCES: IrisResources = {
  ai_actions: {
    // ===== Outreach & Follow-ups =====
    draft_outreach_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `You are a B2B sales assistant. Draft a concise cold outreach email using the provided signal as the hook. Keep it under 100 words. Focus on value, not features. Soft CTA (e.g., "Would you be open to a quick chat?"). Use professional but friendly tone. Return JSON with "subject" and "body".`,
      context_fields: ['lead.company_name', 'lead.trigger_alignment', 'user.offerings', 'lead.hotness_score'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_linkedin_message: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Write a LinkedIn connection request message. Max 200 characters. Reference the trigger signal. No jargon. Friendly and direct. Return JSON with "message".`,
      context_fields: ['lead.company_name', 'lead.trigger_alignment'],
      output_format: { message: 'string' },
    },
    draft_followup_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Draft a follow-up email to a cold outreach with no reply. Brief, direct, provide a new angle or value point. Single CTA. Under 80 words. Return JSON with "subject" and "body".`,
      context_fields: ['lead.company_name', 'coach_state.outreach.initial.outcome'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_phone_script: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Write a 60-second phone call script. Include: opening, value proposition, a question to engage. No fluff. Return JSON with "script".`,
      context_fields: ['lead.company_name', 'lead.strategic_analysis'],
      output_format: { script: 'string' },
    },
    draft_meeting_request: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Write a meeting request email. Specific purpose, suggest 2 time options, ask for 30 minutes. Under 80 words. Return JSON with "subject" and "body".`,
      context_fields: ['lead.company_name', 'coach_state.engagement.follow_up'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_contract_cover_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Write an email covering a proposal or SOW being sent. Warm, professional, clear next step (e.g., "Let me know if you have any questions"). Return JSON with "subject" and "body".`,
      context_fields: ['lead.company_name', 'coach_state.proposal.requirements'],
      output_format: { subject: 'string', body: 'string' },
    },

    // ===== Strategy & Insights =====
    suggest_meeting_agenda: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Suggest a 30-minute meeting agenda for a B2B sales call. Include 3-4 items with timing. Focus on discovery, value demonstration, and next steps. Return JSON with "agenda" array of { item: string, duration_minutes: number }.`,
      context_fields: ['lead.company_name', 'lead.strategic_analysis'],
      output_format: { agenda: 'array' },
    },
    suggest_case_study: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Recommend what kind of case study would resonate most with this lead based on their trigger and strategic analysis. Return JSON with "recommendation" (short description) and "reasoning".`,
      context_fields: ['lead.strategic_analysis', 'lead.trigger_alignment', 'user.past_projects'],
      output_format: { recommendation: 'string', reasoning: 'string' },
    },
    generate_proposal_draft: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Generate a proposal structure. Return JSON with keys: executive_summary (string), our_understanding (string), approach (array of strings), proof_point (string), commercial (object with price_range, timeline, payment_terms), next_steps (string). Flag assumptions with [ASSUMPTION: ...]. Return ONLY JSON.`,
      context_fields: ['lead.company_name', 'lead.strategic_analysis', 'coach_state.proposal.requirements', 'user.offerings'],
      output_format: 'proposal_json', // custom string, but API expects object
    },
    generate_objection_playbook: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `For each objection provided in context, return a JSON array called "playbook". Each item: { objection: string, reframe: string, proof_point: string, question: string }. Return ONLY JSON.`,
      context_fields: ['coach_state.negotiation.objections.objections', 'lead.business_justification', 'user.offerings'],
      output_format: { playbook: 'array' },
    },
    generate_deal_summary: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Write an internal deal summary. Cover: timeline, key contacts, final commercial terms, commitments made, handoff notes for delivery team. Return JSON with keys: summary, key_contacts (array), commitments (array).`,
      context_fields: ['lead.company_name', 'coach_state', 'lead.deal_timeline', 'lead.contacts'],
      output_format: { summary: 'string', key_contacts: 'array', commitments: 'array' },
    },
    generate_onboarding_checklist: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Generate a client onboarding checklist for a new customer. 5-8 tasks with owner ("client" or "us") and suggested timeline in days. Return JSON array "tasks" each with description, owner, days_after_signing.`,
      context_fields: ['lead.company_name', 'user.offerings'],
      output_format: { tasks: 'array' },
    },
  },

  message_templates: {
    // Stage entry messages
    entry_briefing: `Welcome to the **{{lead.company_name}}** deal. Hotness score: {{lead.hotness_score}}/100. Trigger: {{lead.trigger_alignment}}.

Before we reach out, I recommend:
1. Researching key decision makers
2. Drafting a tailored message

Shall I create these tasks for you?`,

    contacted_briefing: `You've made initial contact with {{lead.company_name}}. Outcome: {{coach_state.outreach.initial.outcome}}.

Next priority: book a meeting. I suggest following up within 3 days. I can create a follow-up task with the right channel.`,

    proposal_briefing: `Time to build the proposal for {{lead.company_name}}. Key constraints: {{lead.strategic_hurdles}}. Estimated sales cycle: {{lead.deal_timeline}}.

Let's gather requirements first, then I'll draft the proposal.`,

    negotiation_briefing: `{{lead.company_name}} received the proposal. Let's close this. Tell me what objections they've raised and I'll prepare a response playbook.`,

    won_briefing: `🎉 {{lead.company_name}} is closed! Let me draft the deal summary while you answer a few handoff questions.`,

    lost_briefing: `This one didn't close with {{lead.company_name}}. Logging the reason helps surface patterns across your deals.`,

    // Checkback nudges
    gentle_nudge: `No activity on {{lead.company_name}} for a few days. Want me to draft a follow-up or suggest a different channel?`,

    no_reply_followup_1: `It's been 3 business days since your last outreach to {{lead.company_name}} with no reply. Most deals need 3–5 touches — try a follow-up or switch to LinkedIn.`,

    no_reply_followup_2: `Still no reply from {{lead.company_name}} after 7 days. Time to switch channels — phone or LinkedIn if you've only tried email.`,

    disqualify_or_dormant: `14 days, no response from {{lead.company_name}}. I'd recommend a break-up email or marking this lead dormant. Your call.`,

    meeting_prep: `You have a meeting with {{lead.company_name}} soon. I can suggest an agenda to keep it focused.`,

    proposal_followup: `The proposal for {{lead.company_name}} was sent {{coach_state.proposal.sent.sent_date}}. No response yet. Time for a check-in.`,
  },
};