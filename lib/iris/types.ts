/**
 * /lib/iris/types.ts
 *
 * Core Iris types – Cleaned of legacy tables and fully mapped to the
 * unified, polymorphic 'actions' ledger schema rules.
 */

import type { Database } from '../../database.types';

// ============================================================
// Core Database Row Definitions
// ============================================================

export type Lead = Database['public']['Tables']['leads']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type CoachLog = Database['public']['Tables']['ai_coach_logs']['Row'];

/**
 * The Unified Polymorphic Ledger Row
 * This replaces both the old 'tasks' and 'communications' tables.
 */
export type Action = Database['public']['Tables']['actions']['Row'];

/**
 * Orchestrator Compatibility Alias
 * By pointing the legacy 'Task' token straight to the unified Action row,
 * your background orchestration scripts will compile and execute contextually without modification.
 */
export type Task = Action;

// ============================================================
// Database Enum Declarations (Mapped to Type Unions)
// ============================================================

export type LeadStage = Database['public']['Enums']['lead_status'];
export type CoachLogType = Database['public']['Enums']['coach_log_type'];

/** Replaces legacy 'task_channel' and 'communication_channel' enums */
export type ActionChannel = Database['public']['Enums']['action_channel'];
export type TaskChannel = ActionChannel; // Compatibility alias for playbook.config.ts

/** Replaces legacy 'task_status' and 'action_status' tracking */
export type ActionStatus = Database['public']['Enums']['action_status'];
export type TaskStatus = ActionStatus; // Compatibility alias

/** Identifies the nature of the polymorphic action card */
export type ActionType = Database['public']['Enums']['action_type'];

// ============================================================
// Extended Relational Assembly Types
// ============================================================

export interface LeadWithRelations extends Lead {
  contacts?: Contact[];
  coach_logs?: CoachLog[];
  /** Replaces old individual tasks/communications array feeds */
  actions?: Action[];
}

// ============================================================
// Playbook Structure Definitions (Orchestration Layer Only)
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
  channel: TaskChannel | 'auto'; // Tied safely to action_channel enums
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
  skills?: string[];       // References modules inside salesFrameworkSkills (e.g., 'asking-effective-questions')
  integrations?: string[]; // References connected tools (e.g., 'apollo', 'lusha', 'google_calendar', 'asana')
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
// Orchestrator Execution Return Interfaces
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
// Safe Context Evaluation Bounds
// ============================================================

export type CoachState = Record<string, any>;

export interface EvalContext {
  lead: Lead;
  coach_state: CoachState;
  task?: Partial<Task>;
  user?: Database['public']['Tables']['profiles']['Row'];
}