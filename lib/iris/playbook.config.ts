/**
 * /lib/iris/playbook.config.ts
 */

import type { IrisStageConfig } from './types';

export const IRIS_PLAYBOOK: Record<string, IrisStageConfig> = {
  new: {
    goal: 'Qualify lead and establish verified active contact',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['lead.company_name', 'lead.hotness_score', 'lead.trigger_alignment'],
    },
    tasks: [
      {
        id: 'research_contacts',
        title: 'Identify key decision makers at {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        iris_tip: 'Check LinkedIn, company website, or use corporate data files. Target specific executive tracks.',
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'decision_maker_found', text: 'Did you identify at least one decision maker?', options: ['Yes', 'No'] },
            { id: 'decision_maker_name', text: 'Name and title of the main contact?', type: 'text' },
          ],
          saves_to: 'qualification.decision_maker',
        },
        unlocks_stage_advance: true,
      },
      {
        id: 'initial_outreach',
        title: 'Send initial outreach to {{lead.company_name}}',
        channel: 'auto',
        due_business_days: 2,
        required: true,
        depends_on: ['research_contacts'],
        iris_tip: 'Reference the signal that triggered this lead. Keep it short and value-focused.',
        channel_logic: {
          default: 'email',
          override_if: [
            { condition: 'lead.contacts.some(c => c.linkedin_url !== null)', channel: 'linkedin', note: 'Try LinkedIn first' },
          ],
        },
        ai_actions: ['draft_outreach_email', 'draft_linkedin_message'],
        completion_gate: {
          condition: 'task.feedback_submitted === true',
          blocked_message: 'Please tell Iris how the outreach was received before marking complete.',
        },
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'outcome', text: 'What was the outcome?', options: ['Meeting booked', 'Positive reply', 'No reply', 'Negative reply'] },
            { id: 'channel_used', text: 'Which channel did you use?', options: ['Email', 'LinkedIn', 'Phone'] },
          ],
          saves_to: 'outreach.initial',
        },
        unlocks_stage_advance: true,
      },
    ],
    checkback_rules: [
      {
        id: 'new_no_activity_3d',
        trigger_after_business_days: 3,
        condition: 'no_task_activity',
        iris_message_template: 'gentle_nudge',
        suggested_actions: ['draft_outreach_email'],
      },
      {
        id: 'new_no_activity_7d',
        trigger_after_business_days: 7,
        condition: 'no_task_activity',
        iris_message_template: 'disqualify_or_dormant',
        suggested_actions: [],
      },
    ],
    exit_criteria: [
      { condition: 'coach_state.outreach.initial.outcome === "Meeting booked" || coach_state.outreach.initial.outcome === "Positive reply"', label: 'Active outreach response confirmed' },
      { condition: 'lead.contacts.length > 0', label: 'Minimum stakeholder mapped' },
    ],
    exit_blocked_message: 'Establish clear active engagement or log a valid contact thread before advancing to Contacted.',
  },

  contacted: {
    goal: 'Establish engagement and secure a meeting',
    entry_message: {
      template: 'contacted_briefing',
      context_fields: ['lead.company_name', 'coach_state.outreach.initial.outcome'],
    },
    tasks: [
      {
        id: 'follow_up',
        title: 'Follow up with {{lead.company_name}}',
        channel: 'auto',
        due_business_days: 3,
        required: false,
        depends_on: [],
        iris_tip: 'If no reply after 3 days, try a different channel. If positive reply, propose a meeting.',
        channel_logic: {
          default: 'email',
          override_if: [
            { condition: 'coach_state.outreach.initial.outcome === "No reply"', channel: 'linkedin', note: 'Switch to LinkedIn' },
            { condition: 'coach_state.outreach.initial.outcome === "Positive reply"', channel: 'meeting', note: 'Suggest a meeting' },
          ],
        },
        ai_actions: ['draft_followup_email', 'draft_linkedin_message', 'draft_meeting_request'],
        completion_gate: {
          condition: 'task.feedback_submitted === true',
          blocked_message: 'Log the outcome of this follow-up before completing.',
        },
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'outcome', text: 'What happened?', options: ['Meeting booked', 'Still no reply', 'Positive reply but no meeting', 'Negative reply', 'Unsubscribed'] },
            { id: 'meeting_date', text: 'If meeting booked, what date?', type: 'text' },
          ],
          saves_to: 'engagement.follow_up',
        },
        unlocks_stage_advance: true,
      },
      {
        id: 'send_case_study',
        title: 'Share relevant case study or content',
        channel: 'email',
        due_business_days: 5,
        required: false,
        depends_on: [],
        iris_tip: 'Choose a case study similar to {{lead.company_name}} to build credibility.',
        ai_actions: ['suggest_case_study'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'sent', text: 'Did you send it?', options: ['Yes', 'No'] },
            { id: 'reaction', text: "What was their reaction? (if any)", type: 'text' },
          ],
          saves_to: 'engagement.case_study',
        },
      },
    ],
    checkback_rules: [
      {
        id: 'contacted_no_reply_3d',
        trigger_after_business_days: 3,
        condition: "coach_state.engagement.follow_up.outcome === 'Still no reply'",
        iris_message_template: 'no_reply_followup_1',
        suggested_actions: ['draft_followup_email', 'draft_linkedin_message'],
      },
      {
        id: 'contacted_no_reply_7d',
        trigger_after_business_days: 7,
        condition: "coach_state.engagement.follow_up.outcome === 'Still no reply'",
        iris_message_template: 'no_reply_followup_2',
        suggested_actions: ['draft_phone_script'],
      },
      {
        id: 'contacted_meeting_booked',
        trigger_after_business_days: 1,
        condition: "coach_state.engagement.follow_up.outcome === 'Meeting booked'",
        iris_message_template: 'meeting_prep',
        suggested_actions: ['suggest_meeting_agenda'],
      },
    ],
    exit_criteria: [
      { condition: "coach_state.engagement.follow_up.outcome === 'Meeting booked'", label: 'Meeting scheduled' },
    ],
    exit_blocked_message: 'You need to book a meeting with the lead before moving to Proposal.',
  },

  proposal: {
    goal: 'Deliver a tailored proposal/SOW',
    entry_message: {
      template: 'proposal_briefing',
      context_fields: ['lead.company_name', 'lead.strategic_hurdles', 'lead.deal_timeline'],
    },
    tasks: [
      {
        id: 'gather_requirements',
        title: 'Gather specific requirements from {{lead.company_name}}',
        channel: 'meeting',
        due_business_days: 2,
        required: true,
        iris_tip: "Ask about their timeline, budget, must-have features, and decision process.",
        ai_actions: ['suggest_meeting_agenda'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'budget_range', text: "What's their budget range?", type: 'text' },
            { id: 'must_have_features', text: 'Key requirements they mentioned?', type: 'text' },
            { id: 'timeline', text: 'When do they need this solved?', type: 'text' },
          ],
          saves_to: 'proposal.requirements',
        },
        unlocks_stage_advance: true,
      },
      {
        id: 'draft_proposal',
        title: 'Draft proposal for {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 3,
        required: true,
        depends_on: ['gather_requirements'],
        iris_tip: 'Use Iris to generate a draft, then customize.',
        ai_actions: ['generate_proposal_draft'],
        requires_user_approval: true,
        approval_message: 'Please review the generated proposal draft. Approve it to mark this task complete.',
        completion_gate: {
          condition: 'task.user_approved === true',
          blocked_message: 'You must approve the proposal draft before completing.',
        },
        unlocks_stage_advance: true,
      },
      {
        id: 'send_proposal',
        title: 'Send proposal to {{lead.company_name}}',
        channel: 'email',
        due_business_days: 1,
        required: true,
        depends_on: ['draft_proposal'],
        iris_tip: 'Send as PDF. Include a clear next step.',
        ai_actions: ['draft_contract_cover_email'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'sent_date', text: 'Date sent?', type: 'text' },
            { id: 'expected_response', text: 'When do they expect to respond?', type: 'text' },
          ],
          saves_to: 'proposal.sent',
        },
      },
    ],
    checkback_rules: [
      {
        id: 'proposal_no_response_3d',
        trigger_after_business_days: 3,
        condition: "coach_state.proposal.sent.sent_date !== undefined",
        iris_message_template: 'proposal_followup',
        suggested_actions: ['draft_followup_email'],
      },
    ],
    exit_criteria: [
      { condition: "coach_state.proposal.sent.sent_date !== undefined", label: 'Proposal sent' },
      { condition: "coach_state.proposal.requirements.budget_range !== undefined", label: 'Requirements gathered' },
    ],
    exit_blocked_message: 'Send the proposal and confirm requirements before moving to Negotiation.',
  },

  negotiation: {
    goal: 'Agree on terms, address objections, close',
    entry_message: {
      template: 'negotiation_briefing',
      context_fields: ['lead.company_name', 'lead.strategic_hurdles'],
    },
    tasks: [
      {
        id: 'handle_objections',
        title: 'Address objections from {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        iris_tip: 'Log objections here, then generate a playbook.',
        ai_actions: ['generate_objection_playbook'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'objections', text: 'What objections did they raise? (comma separated)', type: 'text' },
            { id: 'resolved', text: 'Were they resolved?', options: ['Yes', 'Partially', 'No'] },
          ],
          saves_to: 'negotiation.objections',
        },
        unlocks_stage_advance: true,
      },
      {
        id: 'finalize_contract',
        title: 'Finalize contract terms',
        channel: 'internal',
        due_business_days: 3,
        required: true,
        depends_on: ['handle_objections'],
        iris_tip: 'Ensure price, scope, timeline, and payment terms are agreed.',
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'terms_agreed', text: 'Are all terms agreed?', options: ['Yes', 'No'] },
            { id: 'final_price', text: 'Final price?', type: 'text' },
          ],
          saves_to: 'negotiation.contract',
        },
      },
    ],
    checkback_rules: [],
    exit_criteria: [
      { condition: "coach_state.negotiation.objections.resolved === 'Yes'", label: 'Objections resolved' },
      { condition: "coach_state.negotiation.contract.terms_agreed === 'Yes'", label: 'Contract terms agreed' },
    ],
    exit_blocked_message: 'Resolve all objections and finalize contract terms before moving to Won.',
  },

  won: {
    goal: 'Generate internal summary and handoff',
    entry_message: {
      template: 'won_briefing',
      context_fields: ['lead.company_name'],
    },
    tasks: [
      {
        id: 'generate_deal_summary',
        title: 'Create deal summary for {{lead.company_name}}',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        iris_tip: 'Iris can draft this for you.',
        ai_actions: ['generate_deal_summary'],
        requires_user_approval: true,
        approval_message: 'Review the deal summary and approve.',
        completion_gate: {
          condition: 'task.user_approved === true',
          blocked_message: 'Approve the deal summary to complete.',
        },
      },
      {
        id: 'onboarding_checklist',
        title: 'Create onboarding checklist',
        channel: 'internal',
        due_business_days: 2,
        required: false,
        ai_actions: ['generate_onboarding_checklist'],
      },
    ],
    checkback_rules: [],
    exit_criteria: [],
  },

  lost: {
    goal: 'Log reason for loss and archive',
    entry_message: {
      template: 'lost_briefing',
      context_fields: ['lead.company_name'],
    },
    tasks: [
      {
        id: 'log_loss_reason',
        title: 'Why did {{lead.company_name}} not close?',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'reason', text: 'Primary reason for loss', options: ['Price', 'Timing', 'Competitor', 'No need', 'Lost contact', 'Other'] },
            { id: 'notes', text: 'Any additional notes?', type: 'text' },
          ],
          saves_to: 'loss_reason',
        },
      },
    ],
    checkback_rules: [],
    exit_criteria: [],
  },
};