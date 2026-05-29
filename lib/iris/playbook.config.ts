/**
 * /lib/iris/playbook.config.ts
 */
import type { IrisStageConfig } from './types';

export const IRIS_PLAYBOOK: Record<string, IrisStageConfig> = {
  discovery: {
    goal: 'Learn about the business, connect with the right people, and see if there is a qualified fit for your services.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.hotness_score', 'lead.trigger_alignment'],
    },
    tasks: [
      {
        id: 'verify_company_details',
        order: 1, // 🛠️ Explicit configuration order key
        title: 'Check company details for {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        iris_tip: 'Take a quick look at their website. You can use your connected data apps to fill in the blanks automatically.',
        integrations: ['apollo', 'lusha'],
        completion_gate: {
          condition: 'task.metadata.verified_domain !== undefined',
          blocked_message: 'Confirm the company web address or details to lock in your initial research.',
        }
      },
      {
        id: 'find_key_people',
        order: 2, // 🛠️ Explicit configuration order key
        title: 'Find the right people to reach out to',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['verify_company_details'],
        iris_tip: "Find the people who make the final calls, like founders, marketing directors, or branding leaders. A great trick is to check the company's website first—their 'About' or 'Team' pages usually feature their top decision-makers directly. After that, go to their LinkedIn company page and look through the employee list for your 1st or 2nd-degree connections. Finding someone you have a mutual connection with gives you an incredibly warm way to get your foot in the door.",
        skills: ['contact-persona-filtering'],
        integrations: ['apollo', 'lusha'],
        completion_gate: {
          condition: 'task.metadata.total_mapped >= 2',
          blocked_message: 'It is a good idea to find at least 2 people to talk to. This gives you backup options if one contact goes quiet.',
        }
      },
      {
        id: 'pre_outreach_prep',
        order: 3, // 🛠️ Explicit configuration order key
        title: 'Quick review before first contact',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['find_key_people'],
        iris_tip: 'Make sure you have a clear idea of what this company does and what parts of their business you can help improve.',
        completion_gate: {
          condition: 'task.metadata.user_preflight_confirmed === true',
          blocked_message: 'Confirm you have done a quick review of your notes to unlock your custom outreach messages.',
        }
      },
      {
        id: 'send_first_outreach',
        order: 4, // 🛠️ Explicit configuration order key
        title: 'Send your initial outreach message',
        channel: 'auto',
        due_business_days: 2,
        required: true,
        depends_on: ['pre_outreach_prep'],
        iris_tip: 'Choose your preferred channel below. Iris will write a friendly, brief message referencing their recent updates.',
        skills: ['outreach-copywriting-generation'],
        ai_actions: ['draft_outreach_email', 'draft_linkedin_message'],
        completion_gate: {
          condition: 'task.metadata.message_sent === true',
          blocked_message: 'Mark this task complete once you have copied and sent out your initial message line.',
        }
      },
      {
        id: 'log_discovery_call',
        order: 5, // 🛠️ Explicit configuration order key
        title: 'Have your discovery chat and check for deal fit',
        channel: 'meeting',
        due_business_days: 3,
        required: true,
        depends_on: ['send_first_outreach'],
        iris_tip: 'Listen to their challenges. Ask about their goals, who makes final choices, when they want to start, and what kind of budget is available.',
        integrations: ['google_calendar'],
        completion_gate: {
          condition: 'task.metadata.score !== undefined && task.metadata.financial_impact !== undefined',
          blocked_message: 'Log your conversation details and note down the financial impact of their problem to save your work.',
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: [],
    exit_blocked_message: 'You need to get a positive response from a contact and verify project fit before advancing past the Discovery stage.'
  },

  // Stubs for later stages
  engaged: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  solution_fit: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  proposal: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  negotiation: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  close: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  post_close: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  won: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  lost: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] }
};