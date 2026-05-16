/**
 * /lib/iris/resources.config.ts
 *
 * Full config (ai_actions + message_templates) was provided in the previous session.
 * Paste the IRIS_RESOURCES export here.
 *
 * Quick-start stub:
 */

import type { IrisResources } from './types'

export const IRIS_RESOURCES: IrisResources = {
  ai_actions: {
    draft_outreach_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Draft a concise cold outreach email using the signal as the hook. Under 100 words. Soft CTA.',
      context_fields: ['lead.company_name', 'lead.strategic_analysis', 'user.product_offering'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_linkedin_message: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Draft a LinkedIn connection message. Max 200 characters. Reference the signal. No jargon.',
      context_fields: ['lead.company_name', 'lead.trigger_alignment'],
      output_format: { message: 'string' },
    },
    draft_followup_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Draft a follow-up email to a cold outreach with no reply. Brief, direct, new angle. Single CTA.',
      context_fields: ['lead.company_name', 'coach_state.outreach'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_phone_script: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Write a 60-second phone call script. Opening, value prop, question. No fluff.',
      context_fields: ['lead.company_name', 'lead.strategic_analysis', 'coach_state'],
      output_format: { opening: 'string', value_prop: 'string', question: 'string' },
    },
    draft_breakup_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Write a break-up email. Friendly, no hard sell, leaves the door open. Under 50 words.',
      context_fields: ['lead.company_name'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_value_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Draft a value-add email sharing a relevant insight or case study. No pitch. Helpful tone.',
      context_fields: ['lead.company_name', 'lead.strategic_analysis', 'user.product_offering'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_meeting_request: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Write a meeting request email. Specific purpose, 2 time options, 30 mins ask. Under 80 words.',
      context_fields: ['lead.company_name', 'coach_state.outreach'],
      output_format: { subject: 'string', body: 'string' },
    },
    draft_contract_cover_email: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Write an email covering a contract/SOW being sent. Warm, professional, clear next step.',
      context_fields: ['lead.company_name', 'coach_state.requirements'],
      output_format: { subject: 'string', body: 'string' },
    },
    suggest_meeting_agenda: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Suggest a 30-minute meeting agenda for a proposal walkthrough. 3-4 agenda items with timing.',
      context_fields: ['lead.company_name', 'coach_state.requirements'],
      output_format: { agenda: 'array' },
    },
    suggest_case_study: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Suggest what kind of case study would resonate most with this lead based on their trigger and analysis.',
      context_fields: ['lead.strategic_analysis', 'lead.trigger_alignment'],
      output_format: { recommendation: 'string', reasoning: 'string' },
    },
    generate_proposal_draft: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `Generate a proposal structure. Return JSON with keys: executive_summary, our_understanding, approach (array of strings), proof_point, commercial (object with price_range, timeline, payment_terms), next_steps. Flag assumptions with [ASSUMPTION: ...]. Return ONLY JSON.`,
      context_fields: ['lead.company_name', 'lead.strategic_analysis', 'coach_state.requirements', 'user.product_offering'],
      output_format: 'proposal_json',
    },
    generate_objection_playbook: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: `For each objection, return a JSON array called "playbook". Each item: { objection, reframe, proof_point, question }. Return ONLY JSON.`,
      context_fields: ['coach_state.objections', 'lead.business_justification', 'user.product_offering'],
      output_format: 'objection_playbook_json',
    },
    generate_deal_summary: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Write an internal deal summary. Cover: timeline, contacts, commercial terms, commitments, handoff notes.',
      context_fields: ['lead.company_name', 'coach_state', 'lead.deal_timeline'],
      output_format: { summary: 'string', key_contacts: 'array', commitments: 'array' },
    },
    generate_onboarding_checklist: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Generate a client onboarding checklist. 5-8 tasks with owner (client/us) and suggested timeline.',
      context_fields: ['lead.company_name', 'coach_state', 'user.product_offering'],
      output_format: { tasks: 'array' },
    },
    schedule_followup_based_on_reaction: {
      endpoint: '/api/iris/generate',
      model: 'deepseek-chat',
      system_prompt: 'Based on the outreach reaction, recommend the exact next action and timing. Be specific.',
      context_fields: ['coach_state.outreach', 'lead.company_name'],
      output_format: { message: 'string', suggested_actions: 'array' },
    },
  },

  message_templates: {
    entry_briefing: `I've reviewed {{company_name}}'s dossier. The trigger: {{signal_type}}. Hotness score: {{hotness_score}}/100. Before we reach out, I need a couple of things from you.`,
    contacted_briefing: `You're now in contact with {{company_name}}. Summary: {{outreach}}. Priority: move from a reply to a booked meeting.`,
    proposal_briefing: `Time to build the proposal for {{company_name}}. Key constraints: {{strategic_hurdles}}. Estimated sales cycle: {{deal_timeline}}.`,
    negotiation_briefing: `{{company_name}} received the proposal. Let's close this. Tell me what objections they've raised and I'll prepare a response playbook.`,
    won_briefing: `{{company_name}} is closed! Let me draft the deal summary while you answer a few handoff questions.`,
    lost_briefing: `This one didn't close with {{company_name}}. Logging the reason helps surface patterns across your deals.`,
    no_reply_followup_1: `It's been 3 business days since your outreach to {{company_name}} with no reply. Most deals take 3–5 touches — let's try a follow-up or LinkedIn touchpoint.`,
    no_reply_followup_2: `Still no reply from {{company_name}} after 7 days. Time to switch channels — phone or LinkedIn if you've only tried email.`,
    disqualify_or_dormant: `14 days, no response from {{company_name}}. I'd recommend a break-up email or marking this lead dormant. Your call.`,
    gentle_nudge: `No activity on {{company_name}} for 3 days. Want me to draft a follow-up?`,
    channel_switch_prompt: `{{company_name}} hasn't responded to email. Time to try a different channel — phone or LinkedIn usually breaks the silence.`,
    breakup_or_dormant: `14 days of silence from {{company_name}}. A break-up email often gets a response when nothing else did. Or we can park this for 3 months.`,
    proposal_followup: `{{company_name}} received the proposal 3 days ago with no response. Let's follow up.`,
    contract_followup: `The contract has been with {{company_name}} for 5 days unsigned. Worth a check-in call.`,
  },
}