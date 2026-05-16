import type { IrisStageConfig } from './types'

export const IRIS_PLAYBOOK: Record<string, IrisStageConfig> = {
  new: {
    goal: 'Qualify the lead using BANT',
    entry_message: {
      template: 'entry_briefing',
      context_fields: ['company_name', 'signal_type', 'hotness_score', 'strategic_analysis'],
    },
    tasks: [
      {
        id: 'new_research',
        title: 'Research decision-makers',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        iris_tip: 'Find the economic buyer, not just the end user. Check LinkedIn, company site, and the signal source.',
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            {
              id: 'dm_found',
              text: 'Did you identify the right decision-maker?',
              options: ['Yes — confirmed', 'Found a contact, not sure if DM', 'No — still looking'],
            },
            {
              id: 'dm_name',
              text: 'Add their name/role to contacts?',
              type: 'action', // renders as a button linking to ContactsManager
            },
          ],
        },
        completion_gate: {
          condition: 'coach_state.dm_found !== undefined',
          blocked_message: 'Log who you found (or confirm you couldn\'t) before closing this task.',
        },
      },
      {
        id: 'new_outreach',
        title: 'Send initial outreach',
        channel: 'auto', // Iris picks based on channel_logic
        due_business_days: 2,
        required: true,
        depends_on: ['new_research'],
        iris_tip: 'Lead with the signal — reference what triggered this. Keep it under 5 sentences.',
        channel_logic: {
          default: 'email',
          override_if: [
            { condition: 'lead.source === "linkedin_signal"', channel: 'linkedin' },
            { condition: 'lead.hotness_score >= 80', channel: 'email', note: 'High intent — move fast' },
          ],
        },
        ai_actions: ['draft_outreach_email', 'draft_linkedin_message'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            {
              id: 'channel_used',
              text: 'Which channel did you use?',
              options: ['Email', 'LinkedIn', 'Phone', 'Other'],
            },
            {
              id: 'right_person',
              text: 'Did you reach the right person?',
              options: ['Yes', 'Not sure', 'No — different person'],
            },
            {
              id: 'initial_reaction',
              text: 'Any immediate reaction?',
              options: ['No reply yet', 'Positive reply', 'Negative reply', 'Out of office'],
            },
          ],
          // saves all answers into ai_coach_state.outreach
          saves_to: 'outreach',
        },
        // after saving feedback, Iris fires next recommendation
        post_feedback_action: 'schedule_followup_based_on_reaction',
        completion_gate: {
          condition: 'task.feedback_submitted === true',
          blocked_message: 'Log the outcome of your outreach so Iris can set the right follow-up.',
        },
        unlocks_stage_advance: false, // outreach alone doesn't advance — need a reply
      },
    ],
    checkback_rules: [
      {
        id: 'followup_1',
        trigger_after_business_days: 3,
        condition: 'coach_state.outreach.initial_reaction === "No reply yet"',
        iris_message_template: 'no_reply_followup_1',
        suggested_actions: ['draft_followup_email', 'switch_to_linkedin'],
      },
      {
        id: 'followup_2',
        trigger_after_business_days: 7,
        condition: 'coach_state.outreach.initial_reaction === "No reply yet"',
        iris_message_template: 'no_reply_followup_2',
        suggested_actions: ['draft_phone_script', 'draft_linkedin_message'],
      },
      {
        id: 'disqualify_prompt',
        trigger_after_business_days: 14,
        condition: 'coach_state.outreach.initial_reaction === "No reply yet"',
        iris_message_template: 'disqualify_or_dormant',
        suggested_actions: ['draft_breakup_email', 'mark_dormant', 'dismiss_lead'],
      },
    ],
    exit_criteria: [
      { condition: 'coach_state.outreach.initial_reaction === "Positive reply"', label: 'Positive reply received' },
      { condition: 'lead.meetings.length > 0', label: 'Meeting booked' },
    ],
    exit_blocked_message: 'Move to Contacted once you\'ve had a positive reply or booked a meeting.',
  },

  contacted: {
    goal: 'Establish engagement and identify buying signals',
    entry_message: {
      template: 'contacted_briefing',
      context_fields: ['company_name', 'coach_state.outreach', 'contacts'],
    },
    tasks: [
      {
        id: 'contacted_value_share',
        title: 'Share a relevant resource',
        channel: 'email',
        due_business_days: 2,
        required: false,
        iris_tip: 'A case study from a similar company is worth 3x more than a generic brochure.',
        ai_actions: ['suggest_case_study', 'draft_value_email'],
      },
      {
        id: 'contacted_meeting',
        title: 'Book a discovery call',
        channel: 'email',
        due_business_days: 5,
        required: true,
        ai_actions: ['draft_meeting_request', 'suggest_agenda'],
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            {
              id: 'meeting_status',
              text: 'Meeting status?',
              options: ['Confirmed and in calendar', 'Agreed but not scheduled', 'They declined', 'No response yet'],
            },
            {
              id: 'buying_signal',
              text: 'Any buying signals?',
              options: ['Mentioned budget', 'Mentioned timeline', 'Introduced another stakeholder', 'Expressed urgency', 'None yet'],
              multi_select: true,
            },
          ],
          saves_to: 'engagement',
        },
        completion_gate: {
          condition: 'coach_state.engagement.meeting_status === "Confirmed and in calendar"',
          blocked_message: 'A meeting needs to be in the calendar — not just agreed.',
        },
        unlocks_stage_advance: true,
      },
    ],
    checkback_rules: [
      {
        id: 'no_reply_3d',
        trigger_after_business_days: 3,
        condition: 'no_task_activity',
        iris_message_template: 'gentle_nudge',
        suggested_actions: ['draft_followup_email', 'draft_linkedin_message'],
      },
      {
        id: 'no_reply_7d',
        trigger_after_business_days: 7,
        condition: 'no_task_activity',
        iris_message_template: 'channel_switch_prompt',
        suggested_actions: ['draft_phone_script'],
      },
      {
        id: 'breakup_14d',
        trigger_after_business_days: 14,
        condition: 'no_task_activity',
        iris_message_template: 'breakup_or_dormant',
        suggested_actions: ['draft_breakup_email', 'mark_dormant'],
      },
    ],
    exit_criteria: [
      { condition: 'coach_state.engagement.meeting_status === "Confirmed and in calendar"', label: 'Discovery call booked' },
      { condition: 'lead.contacts.length > 0', label: 'Decision-maker in contacts' },
      { condition: 'coach_state.engagement.buying_signal?.length > 0', label: 'At least one buying signal logged' },
    ],
  },

  proposal: {
    goal: 'Deliver a tailored, compelling proposal',
    entry_message: {
      template: 'proposal_briefing',
      context_fields: ['company_name', 'coach_state', 'strategic_hurdles', 'deal_timeline'],
    },
    tasks: [
      {
        id: 'proposal_requirements',
        title: 'Gather requirements',
        channel: 'meeting',
        due_business_days: 3,
        required: true,
        iris_tip: 'Get specifics: desired outcome, constraints, internal approval process, and who else is evaluating.',
        feedback_prompt: {
          trigger: 'on_complete',
          questions: [
            { id: 'primary_outcome', text: 'Their primary desired outcome?', type: 'text' },
            { id: 'budget_ceiling', text: 'Budget ceiling (if mentioned)?', type: 'text' },
            { id: 'competitors', text: 'Are they evaluating others?', options: ['Yes', 'No', 'Not mentioned'] },
            { id: 'approver', text: 'Who needs to sign off?', type: 'text' },
          ],
          saves_to: 'requirements',
        },
      },
      {
        id: 'proposal_draft',
        title: 'Draft proposal',
        channel: 'internal',
        due_business_days: 5,
        required: true,
        depends_on: ['proposal_requirements'],
        ai_actions: ['generate_proposal_draft'],
        // proposal draft requires explicit user review + approval before it's "complete"
        requires_user_approval: true,
        approval_message: 'Review each section — I\'ve flagged assumptions. Approve before sending.',
        completion_gate: {
          condition: 'task.user_approved === true',
          blocked_message: 'You need to review and approve the draft before marking it complete.',
        },
      },
      {
        id: 'proposal_presentation',
        title: 'Schedule proposal walkthrough',
        channel: 'meeting',
        due_business_days: 5,
        required: true,
        depends_on: ['proposal_draft'],
        iris_tip: 'Don\'t send the proposal cold. Book a slot to walk them through it — objections surface in the room.',
        ai_actions: ['suggest_meeting_agenda'],
      },
    ],
    checkback_rules: [
      {
        id: 'proposal_sent_no_response',
        trigger_after_business_days: 3,
        condition: 'proposal_sent && no_reply',
        iris_message_template: 'proposal_followup',
        suggested_actions: ['draft_followup_email', 'draft_phone_script'],
      },
    ],
    exit_criteria: [
      { condition: 'coach_state.requirements !== undefined', label: 'Requirements captured' },
      { condition: 'tasks.proposal_draft.user_approved === true', label: 'Proposal approved and sent' },
      { condition: 'lead.meetings.some(m => m.type === "proposal_presentation")', label: 'Walkthrough scheduled' },
    ],
  },

  negotiation: {
    goal: 'Agree on terms and close',
    entry_message: {
      template: 'negotiation_briefing',
      context_fields: ['company_name', 'coach_state', 'business_justification'],
    },
    tasks: [
      {
        id: 'negotiation_objections',
        title: 'Log objections raised',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        feedback_prompt: {
          trigger: 'on_create', // fires immediately when stage entered
          questions: [
            {
              id: 'objection_types',
              text: 'What objections have they raised?',
              options: ['Price too high', 'Need to think about it', 'Need internal approval', 'Scope concerns', 'Timeline mismatch', 'None yet'],
              multi_select: true,
            },
          ],
          saves_to: 'objections',
        },
        // Iris responds to the objection selection with tailored talking points
        post_feedback_action: 'generate_objection_playbook',
      },
      {
        id: 'negotiation_contract',
        title: 'Send contract / SOW',
        channel: 'email',
        due_business_days: 3,
        required: true,
        ai_actions: ['draft_contract_cover_email'],
        completion_gate: {
          condition: 'coach_state.contract_sent === true',
          blocked_message: 'Mark contract as sent once it\'s out.',
        },
        unlocks_stage_advance: true,
      },
    ],
    checkback_rules: [
      {
        id: 'contract_unsigned',
        trigger_after_business_days: 5,
        condition: 'coach_state.contract_sent && !coach_state.contract_signed',
        iris_message_template: 'contract_followup',
        suggested_actions: ['draft_followup_email', 'draft_phone_script'],
      },
    ],
    exit_criteria: [
      { condition: 'coach_state.contract_sent === true', label: 'Contract sent' },
      { condition: 'coach_state.close_date !== undefined', label: 'Close date confirmed' },
    ],
  },

  won: {
    goal: 'Smooth handoff and deal capture',
    entry_message: { template: 'won_briefing', context_fields: ['company_name', 'coach_state'] },
    tasks: [
      {
        id: 'won_summary',
        title: 'Generate deal summary',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        ai_actions: ['generate_deal_summary'],
        requires_user_approval: true,
      },
      {
        id: 'won_onboarding',
        title: 'Create onboarding tasks',
        channel: 'internal',
        due_business_days: 2,
        required: true,
        ai_actions: ['generate_onboarding_checklist'],
      },
    ],
    checkback_rules: [],
    exit_criteria: [],
  },

  lost: {
    goal: 'Learn and archive for re-engagement',
    entry_message: { template: 'lost_briefing', context_fields: ['company_name'] },
    tasks: [
      {
        id: 'lost_reason',
        title: 'Log loss reason',
        channel: 'internal',
        due_business_days: 1,
        required: true,
        feedback_prompt: {
          trigger: 'on_create',
          questions: [
            {
              id: 'loss_reason',
              text: 'Primary reason for loss?',
              options: ['Price', 'Budget cut', 'Chose competitor', 'Wrong timing', 'No real need', 'Ghosted', 'Other'],
            },
            {
              id: 'reengage_timing',
              text: 'Set re-engage reminder?',
              options: ['3 months', '6 months', '12 months', 'No'],
            },
          ],
          saves_to: 'loss',
        },
        post_feedback_action: 'archive_and_set_reengage_reminder',
      },
    ],
    checkback_rules: [],
    exit_criteria: [],
  },
}