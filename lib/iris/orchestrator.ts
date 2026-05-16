/**
 * /lib/iris/orchestrator.ts
 *
 * The central runtime engine. Reads from playbook.config and resources.config,
 * evaluates conditions against live lead+coach state, and produces all Iris
 * outputs. Runs server-side only.
 *
 * Nothing in this file is hardcoded to a specific stage or sales scenario —
 * all logic flows from the config.
 */

import { IRIS_PLAYBOOK } from './playbook.config'
import { IRIS_RESOURCES } from './resources.config'
import { evaluateCondition } from './condition-evaluator'
import { interpolateTemplate, addBusinessDays, businessDaysBetween } from './template-utils'
import type {
  Lead,
  CoachState,
  IrisTaskConfig,
  IrisCheckbackRule,
  StageEntryResult,
  GateCheckResult,
  AiActionResult,
  Task,
} from './types'
import type { EvalContext } from './condition-evaluator'

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class IrisOrchestrator {
  private context: EvalContext

  constructor(
    private lead: Lead,
    private coachState: CoachState
  ) {
    this.context = {
      lead: lead as any,
      coach_state: coachState,
    }
  }

  // ── Stage entry ─────────────────────────────────────────────────────────────

  /**
   * Called whenever a lead moves into a new stage.
   * Returns the entry message and the initial set of unblocked tasks.
   * Caller (server action) persists these to Supabase.
   */
  async onStageEntry(stage: string): Promise<StageEntryResult | null> {
    const config = IRIS_PLAYBOOK[stage]
    if (!config) {
      console.warn(`[IrisOrchestrator] No config for stage: ${stage}`)
      return null
    }

    // Build entry message from template
    const message = interpolateTemplate(
      IRIS_RESOURCES.message_templates[config.entry_message.template] ?? '',
      this.context
    )

    // Only create tasks that have no unmet dependencies
    const unblocked = config.tasks.filter(
      t => !t.depends_on?.length
    )

    const tasks = unblocked.map(t => this.buildTaskRow(t, stage))

    // For tasks with trigger: 'on_create' feedback prompt,
    // flag them so the UI auto-expands the prompt immediately
    const tasksWithAutoPrompt = tasks.map(t => {
      const cfg = config.tasks.find(c => c.id === t.task_config_id)
      return {
        ...t,
        auto_prompt: cfg?.feedback_prompt?.trigger === 'on_create',
      }
    })

    return { message, tasks: tasksWithAutoPrompt }
  }

  // ── Feedback submission ─────────────────────────────────────────────────────

  /**
   * Called after user submits a task's feedback prompt.
   * Merges answers into coach_state and runs any post_feedback_action.
   * Returns an AI-generated result if the action produces one, else null.
   */
  async onFeedbackSubmit(
    taskId: string,
    answers: Record<string, string | string[]>
  ): Promise<AiActionResult | null> {
    const config = IRIS_PLAYBOOK[this.lead.status]
    const taskConfig = config?.tasks.find(t => t.id === taskId)
    if (!taskConfig?.feedback_prompt) return null

    // Merge answers into the coach_state key defined by saves_to
    const savesTo = taskConfig.feedback_prompt.saves_to
    const updatedCoachState: CoachState = {
      ...this.coachState,
      [savesTo]: answers,
    }

    // Update internal context so post_feedback_action sees fresh state
    this.coachState = updatedCoachState
    this.context = { lead: this.lead as any, coach_state: updatedCoachState }

    if (!taskConfig.post_feedback_action) return null

    return this.runAiAction(taskConfig.post_feedback_action)
  }

  // ── Task completion gate ────────────────────────────────────────────────────

  /**
   * Returns whether a task is allowed to be marked complete,
   * based on its completion_gate condition.
   */
  canCompleteTask(taskId: string, taskRow?: Partial<Task>): GateCheckResult {
    const config = IRIS_PLAYBOOK[this.lead.status]
    const taskConfig = config?.tasks.find(t => t.id === taskId)
    if (!taskConfig?.completion_gate) return { allowed: true }

    // Include the task row in context so conditions like
    // 'task.feedback_submitted === true' can be evaluated
    const ctx: EvalContext = {
      ...this.context,
      task: {
        feedback_submitted: taskRow?.feedback_submitted ?? false,
        user_approved: taskRow?.user_approved ?? false,
        status: taskRow?.status ?? 'pending',
      },
    }

    const passed = evaluateCondition(taskConfig.completion_gate.condition, ctx)
    return passed
      ? { allowed: true }
      : { allowed: false, message: taskConfig.completion_gate.blocked_message }
  }

  // ── Stage advance gate ──────────────────────────────────────────────────────

  /**
   * Returns whether the lead is allowed to advance to the next stage.
   * Also returns which criteria are missing so the UI can list them.
   */
  canAdvanceStage(): { allowed: boolean; missing: string[] } {
    const config = IRIS_PLAYBOOK[this.lead.status]
    if (!config?.exit_criteria?.length) return { allowed: true, missing: [] }

    const missing = config.exit_criteria
      .filter(c => !evaluateCondition(c.condition, this.context))
      .map(c => c.label)

    return { allowed: missing.length === 0, missing }
  }

  // ── Checkback evaluation ────────────────────────────────────────────────────

  /**
   * Evaluates all checkback rules for the current stage against the lead's
   * last activity date. Returns rules that should fire now.
   * Called by the cron job — /api/cron/iris-checkbacks.
   */
  async evaluateCheckbacks(lastActivityDate: Date): Promise<
    Array<{ ruleId: string; message: string; suggestedActions: string[] }>
  > {
    const config = IRIS_PLAYBOOK[this.lead.status]
    if (!config?.checkback_rules?.length) return []

    const daysSince = businessDaysBetween(lastActivityDate, new Date())
    const triggered: Array<{ ruleId: string; message: string; suggestedActions: string[] }> = []

    for (const rule of config.checkback_rules) {
      if (daysSince < rule.trigger_after_business_days) continue

      const conditionMet = this.evaluateCheckbackCondition(rule)
      if (!conditionMet) continue

      const message = interpolateTemplate(
        IRIS_RESOURCES.message_templates[rule.iris_message_template] ?? rule.iris_message_template,
        this.context
      )

      triggered.push({
        ruleId: rule.id,
        message,
        suggestedActions: rule.suggested_actions,
      })

      // Only fire the first matching rule — avoid spamming multiple alerts
      break
    }

    return triggered
  }

  // ── Channel resolution ──────────────────────────────────────────────────────

  /**
   * Resolves which channel Iris recommends for a given task config.
   * If channel is 'auto', evaluates the channel_logic override conditions.
   */
  resolveChannel(taskConfig: IrisTaskConfig): string {
    if (taskConfig.channel !== 'auto') return taskConfig.channel
    if (!taskConfig.channel_logic) return 'email'

    for (const override of taskConfig.channel_logic.override_if) {
      if (evaluateCondition(override.condition, this.context)) {
        return override.channel
      }
    }

    return taskConfig.channel_logic.default
  }

  // ── AI action runner ────────────────────────────────────────────────────────

  /**
   * Calls an AI action defined in IRIS_RESOURCES.ai_actions.
   * Builds the context payload from the action's context_fields,
   * posts to the configured endpoint, and returns the parsed result.
   */
  async runAiAction(actionKey: string): Promise<AiActionResult | null> {
    const action = IRIS_RESOURCES.ai_actions[actionKey]
    if (!action) {
      console.warn(`[IrisOrchestrator] Unknown ai_action: ${actionKey}`)
      return null
    }

    // Build context object from the action's declared context_fields
    const actionContext = this.buildActionContext(action.context_fields)

    const payload = {
      system_prompt: action.system_prompt,
      context: actionContext,
      output_format: action.output_format,
      model: action.model,
    }

    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error(`[IrisOrchestrator] AI action ${actionKey} failed: ${res.status}`)
        return null
      }

      return res.json()
    } catch (err) {
      console.error(`[IrisOrchestrator] AI action ${actionKey} error:`, err)
      return null
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildTaskRow(taskConfig: IrisTaskConfig, stage: string): Partial<Task> & { auto_prompt?: boolean } {
    return {
      lead_id: this.lead.id,
      stage: stage as any,
      task_config_id: taskConfig.id,
      title: taskConfig.title,
      channel: this.resolveChannel(taskConfig) as any,
      due_date: addBusinessDays(new Date(), taskConfig.due_business_days).toISOString(),
      required: taskConfig.required,
      iris_tip: taskConfig.iris_tip ?? null,
      status: 'pending',
      feedback_submitted: false,
      user_approved: false,
    }
  }

  private buildActionContext(fields: string[]): Record<string, unknown> {
    const ctx: Record<string, unknown> = {}
    for (const field of fields) {
      const key = field.split('.').pop() ?? field
      ctx[key] = this.resolveField(field)
    }
    return ctx
  }

  private resolveField(field: string): unknown {
    const parts = field.replace(/\?/g, '').split('.')
    let current: any = {
      lead: this.lead,
      coach_state: this.coachState,
    }[parts[0]]

    for (let i = 1; i < parts.length; i++) {
      if (current == null) return undefined
      current = current[parts[i]]
    }
    return current
  }

  private evaluateCheckbackCondition(rule: IrisCheckbackRule): boolean {
    // Special sentinel used in config for "no task or comm activity"
    if (rule.condition === 'no_task_activity') return true
    if (rule.condition === 'no_reply') return true
    return evaluateCondition(rule.condition, this.context)
  }
}