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
        order: 1,
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
        order: 2,
        title: 'Find the right people to reach out to',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['verify_company_details'],
        iris_tip: "Find the people who make the final calls, like founders, marketing directors, or branding leaders. A great trick is to check the company's website first—their 'About' or 'Team' pages usually feature their top decision-makers directly. After that, go to their LinkedIn company page and look through the employee list for your 1st or 2nd-degree connections. Finding someone you have a mutual connection with gives you an incredibly warm way to get your foot in the door.",
        integrations: ['apollo', 'lusha'],
        completion_gate: {
          condition: 'task.metadata.total_mapped >= 2',
          blocked_message: 'It is a good idea to find at least 2 people to talk to. This gives you backup options if one contact goes quiet.',
        }
      },
      {
        id: 'pre_outreach_prep',
        order: 3,
        title: 'Quick review before first contact',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['find_key_people'],
        skills: ['contact-persona-filtering'],
        iris_tip: 'Make sure you have a clear idea of what this company does and what parts of their business you can help improve.',
        completion_gate: {
          condition: 'task.metadata.user_preflight_confirmed === true',
          blocked_message: 'Confirm you have done a quick review of your notes to unlock your custom outreach messages.',
        }
      },
      {
        id: 'send_first_outreach',
        order: 4,
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
        order: 5,
        title: 'Track initial response & secure conversational fit',
        channel: 'meeting',
        due_business_days: 3,
        required: true,
        depends_on: ['send_first_outreach'],
        iris_tip: 'Note down whether they responded and adjust contact statuses accordingly. Getting a positive reply unlocks stage advancement.',
        completion_gate: {
          // Re-mapped dynamically to verify contact row status changes via condition-evaluator
          condition: 'lead.contacts.some(c => c.status === "engaged")',
          blocked_message: 'Log a successful response outcome and set a saved contact status to Engaged to close discovery.',
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: [],
    exit_blocked_message: 'You need to get a positive response from a contact and verify project fit before advancing past the Discovery stage.'
  },

  engaged: {
    goal: 'Nurture prospect relationship, answer baseline questions, and secure depth requirements with primary stakeholders.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.strategic_analysis']
    },
    tasks: [
      {
        id: 'nurture_followup',
        order: 1,
        title: 'Send relationship nurturing touchpoint',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        iris_tip: 'Share a relevant point or insight that aligns with your previous discovery sync to maintain momentum.',
        completion_gate: {
          condition: 'task.metadata.followup_logged === true',
          blocked_message: 'Confirm you have dispatched your nurturing follow-up line to advance.'
        }
      },
      {
        id: 'map_additional_stakeholders',
        order: 2,
        title: 'Map core economic decision makers',
        channel: 'internal',
        due_business_days: 2,
        required: false,
        iris_tip: 'Identify peripheral champions or executive sponsors who will be evaluating your upcoming proposal parameters.'
      }
    ],
    checkback_rules: [],
    exit_criteria: []
  },

  solution_fit: {
    goal: 'Examine product or project scope requirements and validate service alignment boundaries.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.strategic_hurdles']
    },
    tasks: [
      {
        id: 'technical_scoping_review',
        order: 1,
        title: 'Conduct scoping requirements breakdown',
        channel: 'internal',
        due_business_days: 3,
        required: true,
        iris_tip: 'Detail technical constraints, project volume requirements, or creative parameters matching their current systems.',
        completion_gate: {
          condition: 'task.metadata.scope_parameters_saved === true',
          blocked_message: 'Log detailed project scope metrics to formalize solution alignment guidelines.'
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: []
  },

  proposal: {
    goal: 'Compile the formalized strategic strategy agreement proposal and deliver commercial terms.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.business_justification']
    },
    tasks: [
      {
        id: 'generate_proposal_file',
        order: 1,
        title: 'Draft customized strategy proposal proposal',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        iris_tip: 'Incorporate business alignment justifications and explicit project timelines into your quote framework.',
        completion_gate: {
          condition: 'task.metadata.proposal_attached === true',
          blocked_message: 'Attach or confirm your strategy proposal text to continue.'
        }
      },
      {
        id: 'deliver_proposal_review',
        order: 2,
        title: 'Present proposal deck to client stakeholders',
        channel: 'meeting',
        due_business_days: 3,
        required: true,
        depends_on: ['generate_proposal_file'],
        iris_tip: 'Walk key decision makers through pricing parameters, outcomes, and proof profiles.',
        completion_gate: {
          condition: 'task.metadata.review_completed === true',
          blocked_message: 'Complete the review sync with the client team to unlock final closing tracks.'
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: []
  },

  negotiation: {
    goal: 'Resolve pricing or delivery objections and coordinate contract redline variations.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.strategic_hurdles']
    },
    tasks: [
      {
        id: 'finalize_commercial_terms',
        order: 1,
        title: 'Address commercial terms and redlines',
        channel: 'internal',
        due_business_days: 3,
        required: true,
        iris_tip: 'Adjust final pricing models or delivery parameters based on structural feedback received.',
        completion_gate: {
          condition: 'task.metadata.terms_agreed === true',
          blocked_message: 'Confirm client consensus on commercial parameters to unlock signing paperwork.'
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: []
  },

  close: {
    goal: 'Finalize agreement execution, determine transaction outcome, and initialize client handovers for won accounts.',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.deal_timeline']
    },
    tasks: [
      {
        id: 'execute_paperwork',
        order: 1,
        title: 'Finalize formal agreement signing',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        iris_tip: 'Verify signatures are executed on final contracts before moving to archive tracks.',
        completion_gate: {
          condition: 'task.metadata.paperwork_completed === true',
          blocked_message: 'Confirm that signed documents have been completed or collected.'
        }
      },
      {
        id: 'determine_outcome',
        order: 2,
        title: 'Log final deal resolution state',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        depends_on: ['execute_paperwork'],
        iris_tip: 'Log the final resolution of this file to settle metrics ledger values cleanly.',
        completion_gate: {
          condition: "task.metadata.deal_outcome === 'won' || task.metadata.deal_outcome === 'lost'",
          blocked_message: 'Explicitly mark this opportunity outcome track as Won or Lost.'
        }
      },
      {
        id: 'post_close_handover',
        order: 3,
        title: 'Onboarding Handover Summary Checklist',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        depends_on: ['determine_outcome'],
        iris_tip: 'If won, compile handover specs and kickoff parameters for onboarding. If lost, this step auto-resolves on save.',
        completion_gate: {
          condition: "task.metadata.handover_completed === true || task.metadata.deal_outcome === 'lost'",
          blocked_message: 'Complete the client onboarding checklist to finalize this file.'
        }
      }
    ],
    checkback_rules: [],
    exit_criteria: []
  }
};