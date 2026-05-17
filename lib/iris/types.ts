/**
 * /lib/iris/types.ts
 *
 * Core Iris types – reuses Supabase database types for table rows,
 * adds orchestration-specific types (playbook, resources, etc.).
 */

import type { Database } from '../../database.types';

// ============================================================
// Re-exported database row types (for convenience)
// ============================================================

export type Lead = Database['public']['Tables']['leads']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Communication = Database['public']['Tables']['communications']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type CoachLog = Database['public']['Tables']['ai_coach_logs']['Row'];

// ============================================================
// Enum types from database (mapped to TypeScript unions)
// ============================================================

export type LeadStage = Database['public']['Enums']['lead_status']; // 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type TaskChannel = Database['public']['Enums']['task_channel'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type CoachLogType = Database['public']['Enums']['coach_log_type'];
export type CommunicationChannel = Database['public']['Enums']['communication_channel'];
export type CommunicationDirection = Database['public']['Enums']['communication_direction'];

// ============================================================
// Helper type for coach_state (JSONB)
// ============================================================

export type CoachState = Record<string, any>;

// ============================================================
// Extended types (add relations that Supabase types don't include)
// ============================================================

export interface LeadWithRelations extends Lead {
  contacts?: Contact[];
  communications?: Communication[];
  tasks?: Task[];
  coach_logs?: CoachLog[];
}

// ============================================================
// Playbook configuration types (not in DB)
// ============================================================

export interface IrisStageConfig {
  goal: string;
  entry_message: {
    template: string;
    context_fields: string[];
  };
  tasks: IrisTaskConfig[];
  checkback_rules: IrisCheckbackRule[];
  exit_criteria: ExitCriterion[];
  exit_blocked_message?: string;
}

export interface IrisTaskConfig {
  id: string;
  title: string;
  channel: TaskChannel | 'auto';
  due_business_days: number;
  required: boolean;
  depends_on?: string[];
  iris_tip?: string;
  channel_logic?: ChannelLogic;
  ai_actions?: string[];
  feedback_prompt?: FeedbackPrompt;
  post_feedback_action?: string;
  requires_user_approval?: boolean;
  approval_message?: string;
  completion_gate?: CompletionGate;
  unlocks_stage_advance?: boolean;
}

export interface ChannelLogic {
  default: TaskChannel;
  override_if: Array<{
    condition: string;
    channel: TaskChannel;
    note?: string;
  }>;
}

export interface CompletionGate {
  condition: string;
  blocked_message: string;
}

export interface ExitCriterion {
  condition: string;
  label: string;
}

export interface IrisCheckbackRule {
  id: string;
  trigger_after_business_days: number;
  condition: string;
  iris_message_template: string;
  suggested_actions: string[];
}

export interface FeedbackPrompt {
  trigger: 'on_complete' | 'on_create';
  questions: FeedbackQuestion[];
  saves_to: string;
}

export interface FeedbackQuestion {
  id: string;
  text: string;
  type?: 'text' | 'action';
  options?: string[];
  multi_select?: boolean;
}

export interface IrisAiAction {
  endpoint: string;
  model: string;
  system_prompt: string;
  context_fields: string[];
  output_format: string | Record<string, string>;
}

export interface IrisResources {
  ai_actions: Record<string, IrisAiAction>;
  message_templates: Record<string, string>;
}

// ============================================================
// Orchestrator return types
// ============================================================

export interface StageEntryResult {
  message: string;
  tasks: Partial<Task>[];
}

export interface GateCheckResult {
  allowed: boolean;
  message?: string;
}

export interface AiActionResult {
  message?: string;
  suggested_actions?: string[];
  [key: string]: any;
}

// ============================================================
// EvalContext for condition evaluator
// ============================================================

export interface EvalContext {
  lead: Lead;
  coach_state: CoachState;
  task?: Partial<Task>;
  user?: Database['public']['Tables']['profiles']['Row'];
}