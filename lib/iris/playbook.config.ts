/**
 * /lib/iris/playbook.config.ts
 */
import type { IrisStageConfig } from './types';

export const IRIS_PLAYBOOK: Record<string, IrisStageConfig> = {
  discovery: {
    goal: 'Learn about the business, find the right people to connect with, and see if there is a real fit for your services.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.hotness_score', 'lead.trigger_alignment'],
    },
    tasks: [
      {
        id: 'verify_company_details',
        title: 'Check company details for {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        iris_tip: 'Take a quick look at their website. If you use tools like Apollo or Lusha, you can pull details automatically to fill in the blanks.',
        completion_gate: {
          condition: 'task.metadata.verified_domain !== undefined',
          blocked_message: 'Confirm the company web address or details to lock in your initial research.',
        }
      },
      {
        id: 'find_key_people',
        title: 'Find the right people to reach out to',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['verify_company_details'],
        iris_tip: 'Look for individuals who handle operations, marketing, or technology depending on what you offer.',
        completion_gate: {
          condition: 'task.metadata.total_mapped >= 2',
          blocked_message: 'It is a good idea to find at least 2 people to talk to. This gives you backup options if one contact goes quiet or leaves.',
        }
      },
      {
        id: 'pre_outreach_prep',
        title: 'Quick review before first contact',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['find_key_people'],
        iris_tip: 'Make sure you have a clear idea of what this company does and what parts of their business you can help improve based on their recent updates.',
        completion_gate: {
          condition: 'task.metadata.user_preflight_confirmed === true',
          blocked_message: 'Confirm you have done a quick review of your notes to unlock your custom outreach messages.',
        }
      },
      {
        id: 'send_first_outreach',
        title: 'Send your initial outreach message',
        channel: 'auto',
        due_business_days: 2,
        required: true,
        depends_on: ['pre_outreach_prep'],
        iris_tip: 'Use Iris to draft a quick, helpful message. Keep it short, point directly to their recent news, and focus entirely on how you can help.',
        ai_actions: ['draft_outreach_email', 'draft_linkedin_message'],
        completion_gate: {
          condition: 'task.metadata.message_sent === true',
          blocked_message: 'Mark this task complete once you have copied and sent out your initial message line.',
        }
      },
      {
        id: 'log_discovery_call',
        title: 'Have your discovery chat and check for deal fit',
        channel: 'meeting',
        due_business_days: 3,
        required: true,
        depends_on: ['send_first_outreach'],
        iris_tip: 'Listen to their challenges. Ask about their target goals, who makes final choices, when they want to start, and what kind of budget is available.',
        completion_gate: {
          condition: 'task.metadata.score !== undefined && task.metadata.financial_impact !== undefined',
          blocked_message: 'Log your conversation details and note down the financial impact of their problem to save your work.',
        }
      }
    ],
    checkback_rules: [
      {
        id: 'discovery_stalled_3d',
        trigger_after_business_days: 3,
        condition: 'no_task_activity',
        iris_message_template: 'gentle_nudge',
        suggested_actions: []
      }
    ],
    exit_criteria: [
      { condition: 'lead.contacts.length >= 2', label: 'At least 2 contacts listed' },
      { condition: 'task.metadata.score >= 8', label: 'Good overall project fit verified' }
    ],
    exit_blocked_message: 'Finish up your active research and log your conversation notes before moving this project to the next stage.',
  },

  // Stubs for later stages to keep the compiler happy
  engaged: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  solution_fit: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  proposal: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  negotiation: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  close: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  post_close: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  won: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] },
  lost: { goal: '', entry_message: { template: 'entry_briefing', context_fields: [] }, tasks: [], checkback_rules: [], exit_criteria: [] }
};