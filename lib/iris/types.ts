/**
 * /lib/iris/types.ts
 * Shared types for the Iris orchestration system.
 * Consumed by: playbook.config, orchestrator, condition-evaluator, all components.
 */

// ─── Playbook config types ────────────────────────────────────────────────────

export interface IrisStageConfig {
  goal: string
  entry_message: {
    template: string          // key in IRIS_RESOURCES.message_templates
    context_fields: string[]  // dot-paths resolved against EvalContext
  }
  tasks: IrisTaskConfig[]
  checkback_rules: IrisCheckbackRule[]
  exit_criteria: ExitCriterion[]
  exit_blocked_message?: string
}

export interface IrisTaskConfig {
  id: string
  title: string
  channel: TaskChannel
  due_business_days: number
  required: boolean
  depends_on?: string[]           // task ids that must complete first
  iris_tip?: string
  channel_logic?: ChannelLogic
  ai_actions?: string[]           // keys in IRIS_RESOURCES.ai_actions
  feedback_prompt?: FeedbackPrompt
  post_feedback_action?: string   // key in IRIS_RESOURCES.ai_actions
  requires_user_approval?: boolean
  approval_message?: string
  completion_gate?: CompletionGate
  unlocks_stage_advance?: boolean
}

export type TaskChannel =
  | 'email'
  | 'linkedin'
  | 'phone'
  | 'meeting'
  | 'internal'
  | 'auto'

export interface ChannelLogic {
  default: TaskChannel
  override_if: Array<{
    condition: string   // evaluated against EvalContext
    channel: TaskChannel
    note?: string
  }>
}

export interface CompletionGate {
  condition: string       // evaluated against EvalContext
  blocked_message: string
}

export interface ExitCriterion {
  condition: string       // evaluated against EvalContext
  label: string           // shown to user in gate UI
}

export interface IrisCheckbackRule {
  id: string
  trigger_after_business_days: number
  condition: string       // 'no_task_activity' or a full EvalContext expression
  iris_message_template: string
  suggested_actions: string[]
}

// ─── Feedback prompt types ────────────────────────────────────────────────────

export interface FeedbackPrompt {
  trigger: 'on_complete' | 'on_create'
  questions: FeedbackQuestion[]
  saves_to: string        // key written into ai_coach_state
}

export interface FeedbackQuestion {
  id: string
  text: string
  type?: 'text' | 'action'  // default: option buttons
  options?: string[]
  multi_select?: boolean
}

// ─── AI resource types ────────────────────────────────────────────────────────

export interface IrisAiAction {
  endpoint: string
  model: string
  system_prompt: string
  context_fields: string[]
  output_format: string | Record<string, string>
}

export interface IrisResources {
  ai_actions: Record<string, IrisAiAction>
  message_templates: Record<string, string>
}

// ─── Runtime / DB types ───────────────────────────────────────────────────────

/** Mirrors the `leads` table row with joined relations */
export interface Lead {
  id: string
  user_id: string
  company_name: string
  status: LeadStage
  hotness_score: number | null
  strategic_analysis: string | null
  trigger_alignment: string | null
  strategic_hurdles: string | null
  business_justification: string | null
  deal_timeline: string | null
  ai_coach_state: CoachState
  created_at: string
  updated_at: string
  // joined
  contacts?: Contact[]
  meetings?: Meeting[]
  communications?: Communication[]
}

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type CoachState = Record<string, any>

/** Mirrors the `ai_coach_logs` table */
export interface CoachLog {
  id: string
  lead_id: string
  stage: LeadStage
  type: CoachLogType
  message: string | null
  suggested_actions: string[]
  suggested_tasks: Partial<Task>[]
  metadata: Record<string, any> | null
  created_at: string
}

export type CoachLogType =
  | 'entry'
  | 'checkback'
  | 'post_feedback'
  | 'task_unlocked'
  | 'stage_exit'

/** Mirrors the `tasks` table */
export interface Task {
  id: string
  lead_id: string
  stage: LeadStage
  task_config_id: string      // matches IrisTaskConfig.id
  title: string
  channel: TaskChannel
  due_date: string
  required: boolean
  iris_tip: string | null
  status: TaskStatus
  feedback_submitted: boolean
  feedback_answers: Record<string, string | string[]> | null
  feedback_saves_to: string | null
  user_approved: boolean
  completed_at: string | null
  created_at: string
}

export type TaskStatus = 'pending' | 'completed' | 'skipped'

export interface Contact {
  id: string
  lead_id: string
  name: string
  role: string | null
  email: string | null
  linkedin: string | null
  is_decision_maker: boolean
}

export interface Meeting {
  id: string
  lead_id: string
  type: string
  scheduled_at: string
  notes: string | null
}

export interface Communication {
  id: string
  lead_id: string
  channel: TaskChannel
  direction: 'outbound' | 'inbound'
  summary: string | null
  created_at: string
}

// ─── Orchestrator return types ────────────────────────────────────────────────

export interface StageEntryResult {
  message: string
  tasks: Partial<Task>[]
}

export interface GateCheckResult {
  allowed: boolean
  message?: string
}

export interface AiActionResult {
  message?: string
  suggested_actions?: string[]
  [key: string]: any
}