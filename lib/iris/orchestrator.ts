/**
 * /lib/iris/orchestrator.ts
 *
 * The central runtime engine. Reads from playbook.config and resources.config,
 * evaluates conditions against live lead+coach state, and produces all Iris
 * outputs. Runs server-side only.
 */

import { IRIS_PLAYBOOK } from './playbook.config';
import { IRIS_RESOURCES } from './resources.config';
import { evaluateCondition, evaluateExitCriteria, type CriterionResult } from './condition-evaluator';
import { interpolateTemplate, addBusinessDays, businessDaysBetween } from './template-utils';
import type {
  Lead,
  LeadStage,
  CoachState,
  IrisTaskConfig,
  IrisCheckbackRule,
  StageEntryResult,
  GateCheckResult,
  AiActionResult,
  Task,
  EvalContext,
} from './types';

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class IrisOrchestrator {
  private context: EvalContext;
  private lead: Lead;
  private coachState: CoachState;

  constructor(lead: Lead, coachState: CoachState, userProfile?: any) {
    this.lead = lead;
    this.coachState = coachState;
    this.context = {
      lead: lead as any,
      coach_state: coachState,
      user: userProfile, // optional, from profiles table
    };
  }

  // ── Stage entry ─────────────────────────────────────────────────────────────

  /**
   * Called whenever a lead moves into a new stage.
   * Returns the entry message and a list of suggested tasks (not yet created).
   * The caller (server action) should present these to the user for confirmation.
   */
  async onStageEntry(stage: LeadStage): Promise<StageEntryResult | null> {
    const config = IRIS_PLAYBOOK[stage];
    if (!config) {
      console.warn(`[IrisOrchestrator] No config for stage: ${stage}`);
      return null;
    }

    // Build entry message from template
    const messageTemplate = IRIS_RESOURCES.message_templates[config.entry_message.template];
    const message = interpolateTemplate(messageTemplate || '', this.context);

    // Identify which tasks are unblocked (no unmet dependencies)
    const completedTaskIds = await this.getCompletedTaskConfigIds();
    const unblocked = config.tasks.filter(task => {
      if (!task.depends_on?.length) return true;
      return task.depends_on.every(depId => completedTaskIds.has(depId));
    });

    // Build task suggestions (not inserted into DB yet)
    const suggestedTasks = unblocked.map(taskConfig => this.buildSuggestedTask(taskConfig, stage));

    return { message, tasks: suggestedTasks };
  }

  // ── Confirm task creation (user accepted the suggestion) ───────────────────

  /**
   * After user confirms a suggested task, this returns the full Task object
   * ready to be inserted into the database.
   */
  confirmTask(suggestion: Partial<Task>, stage: LeadStage): Partial<Task> {
    return {
      ...suggestion,
      status: 'pending',
      feedback_submitted: false,
      user_approved: false,
      auto_prompt: suggestion.auto_prompt ?? false,
    };
  }

  // ── Feedback submission ─────────────────────────────────────────────────────

  /**
   * Called after user submits a task's feedback prompt.
   * Merges answers into coach_state and runs any post_feedback_action.
   * Returns an AI-generated result if the action produces one, else null.
   */
  async onFeedbackSubmit(taskConfigId: string, answers: Record<string, any>): Promise<AiActionResult | null> {
    const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
    const taskConfig = config?.tasks.find(t => t.id === taskConfigId);
    if (!taskConfig?.feedback_prompt) return null;

    // Merge answers into coach_state at the path defined by saves_to
    const savesTo = taskConfig.feedback_prompt.saves_to;
    const updatedCoachState = this.mergeIntoCoachState(savesTo, answers);

    // Update internal context
    this.coachState = updatedCoachState;
    this.context.coach_state = updatedCoachState;

    // Run post-feedback AI action if defined
    if (taskConfig.post_feedback_action) {
      return this.runAiAction(taskConfig.post_feedback_action);
    }

    return null;
  }

  // ── Task completion gate ────────────────────────────────────────────────────

  /**
   * Returns whether a task is allowed to be marked complete,
   * based on its completion_gate condition and the current task row state.
   */
  canCompleteTask(taskConfigId: string, taskRow: Partial<Task>): GateCheckResult {
    const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
    const taskConfig = config?.tasks.find(t => t.id === taskConfigId);
    if (!taskConfig?.completion_gate) return { allowed: true };

    const ctx: EvalContext = {
      ...this.context,
      task: {
        ...taskRow,
        feedback_submitted: taskRow.feedback_submitted ?? false,
        user_approved: taskRow.user_approved ?? false,
      },
    };

    const allowed = evaluateCondition(taskConfig.completion_gate.condition, ctx);
    return allowed
      ? { allowed: true }
      : { allowed: false, message: taskConfig.completion_gate.blocked_message };
  }

  // ── Stage advance gate ──────────────────────────────────────────────────────

  /**
   * Returns whether the lead is allowed to advance to the next stage.
   * Also returns per-criterion results for UI display.
   */
  canAdvanceStage(): { allowed: boolean; criteriaResults: CriterionResult[]; blockedMessage?: string } {
    const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
    if (!config?.exit_criteria?.length) {
      return { allowed: true, criteriaResults: [] };
    }

    const criteriaResults = evaluateExitCriteria(config.exit_criteria, this.context);
    const allPassed = criteriaResults.every(c => c.passed);
    return {
      allowed: allPassed,
      criteriaResults,
      blockedMessage: allPassed ? undefined : config.exit_blocked_message,
    };
  }

  // ── Checkback evaluation ────────────────────────────────────────────────────

  /**
   * Evaluates all checkback rules for the current stage against the lead's
   * last activity date. Returns rules that should fire now.
   * Called by the cron job.
   */
  async evaluateCheckbacks(lastActivityDate: Date): Promise<
    Array<{ ruleId: string; message: string; suggestedActions: string[] }>
  > {
    const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
    if (!config?.checkback_rules?.length) return [];

    const daysSince = businessDaysBetween(lastActivityDate, new Date());
    const triggered: Array<{ ruleId: string; message: string; suggestedActions: string[] }> = [];

    for (const rule of config.checkback_rules) {
      if (daysSince < rule.trigger_after_business_days) continue;

      let conditionMet = false;
      if (rule.condition === 'no_task_activity') {
        conditionMet = await this.hasNoTaskActivitySince(lastActivityDate);
      } else {
        conditionMet = evaluateCondition(rule.condition, this.context);
      }

      if (!conditionMet) continue;

      const messageTemplate = IRIS_RESOURCES.message_templates[rule.iris_message_template];
      const message = interpolateTemplate(messageTemplate || rule.iris_message_template, this.context);

      triggered.push({
        ruleId: rule.id,
        message,
        suggestedActions: rule.suggested_actions,
      });

      // Only fire the first matching rule to avoid spam
      break;
    }

    return triggered;
  }

  // ── AI action runner ────────────────────────────────────────────────────────

  /**
   * Calls an AI action defined in IRIS_RESOURCES.ai_actions.
   * Builds the context payload from the action's context_fields,
   * posts to the configured endpoint, and returns the parsed result.
   */
  async runAiAction(actionKey: string): Promise<AiActionResult | null> {
    const action = IRIS_RESOURCES.ai_actions[actionKey];
    if (!action) {
      console.warn(`[IrisOrchestrator] Unknown ai_action: ${actionKey}`);
      return null;
    }

    // Build context object from the action's declared context_fields
    const actionContext = this.buildActionContext(action.context_fields);

    const payload = {
      system_prompt: action.system_prompt,
      context: actionContext,
      output_format: action.output_format,
      model: action.model,
    };

    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`[IrisOrchestrator] AI action ${actionKey} failed: ${res.status}`);
        return null;
      }

      return res.json();
    } catch (err) {
      console.error(`[IrisOrchestrator] AI action ${actionKey} error:`, err);
      return null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildSuggestedTask(taskConfig: IrisTaskConfig, stage: LeadStage): Partial<Task> {
    const title = interpolateTemplate(taskConfig.title, this.context);
    const channel = this.resolveChannel(taskConfig);
    const dueDate = addBusinessDays(new Date(), taskConfig.due_business_days);
    const irisTip = taskConfig.iris_tip ? interpolateTemplate(taskConfig.iris_tip, this.context) : null;

    return {
      lead_id: this.lead.id,
      stage,
      task_config_id: taskConfig.id,
      title,
      channel,
      due_date: dueDate.toISOString(),
      required: taskConfig.required,
      iris_tip: irisTip,
      auto_prompt: taskConfig.feedback_prompt?.trigger === 'on_create',
    };
  }

  private resolveChannel(taskConfig: IrisTaskConfig): Task['channel'] {
    if (taskConfig.channel !== 'auto') return taskConfig.channel;
    if (!taskConfig.channel_logic) return 'email';

    for (const override of taskConfig.channel_logic.override_if) {
      if (evaluateCondition(override.condition, this.context)) {
        return override.channel;
      }
    }
    return taskConfig.channel_logic.default;
  }

  private buildActionContext(fields: string[]): Record<string, unknown> {
    const ctx: Record<string, unknown> = {};
    for (const field of fields) {
      const key = field.split('.').pop() ?? field;
      ctx[key] = this.resolveField(field);
    }
    return ctx;
  }

  private resolveField(field: string): unknown {
    const parts = field.replace(/\?/g, '').split('.');
    const root = parts[0];
    let current: any;

    if (root === 'lead') current = this.lead;
    else if (root === 'coach_state') current = this.coachState;
    else if (root === 'user') current = this.context.user;
    else current = this.coachState?.[root];

    for (let i = 1; i < parts.length; i++) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  private mergeIntoCoachState(path: string, answers: Record<string, any>): CoachState {
    // Simple deep merge – supports dot notation like "outreach.initial"
    const parts = path.split('.');
    let current: any = { ...this.coachState };
    let target = current;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part]) target[part] = {};
      target = target[part];
    }
    const lastPart = parts[parts.length - 1];
    target[lastPart] = { ...target[lastPart], ...answers };
    return current;
  }

  private async getCompletedTaskConfigIds(): Promise<Set<string>> {
    // This would query the database. We'll implement this in the server action,
    // not inside the orchestrator, to keep it pure. For now, return empty set.
    // The caller (server action) will pass completed task IDs as a parameter.
    return new Set();
  }

  private async hasNoTaskActivitySince(since: Date): Promise<boolean> {
    // This would query the database. We'll implement in the caller.
    // For orchestrator purity, we accept a flag or query result.
    // For now, assume false (no checkback will fire based on this alone).
    return false;
  }
}