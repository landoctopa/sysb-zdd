/**
 * /lib/iris/orchestrator.ts
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
  StageEntryResult,
  GateCheckResult,
  AiActionResult,
  Task,
  EvalContext,
} from './types';

export class IrisOrchestrator {
  private context: EvalContext;
  private lead: Lead;
  private coachState: CoachState;
  private existingTasks: Task[];

  constructor(lead: Lead, coachState: CoachState, userProfile?: any, existingTasks: Task[] = []) {
    this.lead = lead;
    this.coachState = coachState;
    this.existingTasks = existingTasks;
    this.context = {
      lead: lead as any,
      coach_state: coachState,
      user: userProfile,
    };
  }

  async onStageEntry(stage: LeadStage): Promise<StageEntryResult | null> {
    const config = IRIS_PLAYBOOK[stage];
    if (!config) {
      console.warn(`[IrisOrchestrator] No config for stage: ${stage}`);
      return null;
    }

    const messageTemplate = IRIS_RESOURCES.message_templates[config.entry_message.template];
    const message = interpolateTemplate(messageTemplate || '', this.context);

    // Compute exact unblocked tasks using the database task collection
    const completedTaskIds = this.getCompletedTaskConfigIds();
    const unblocked = config.tasks.filter(task => {
      if (!task.depends_on?.length) return true;
      return task.depends_on.every(depId => completedTaskIds.has(depId));
    });

    const suggestedTasks = unblocked.map(taskConfig => this.buildSuggestedTask(taskConfig, stage));

    return { message, tasks: suggestedTasks };
  }

  confirmTask(suggestion: Partial<Task>, stage: LeadStage): Partial<Task> {
  const currentMeta = (suggestion.metadata as Record<string, any>) || {};
  return {
    ...suggestion,
    status: 'pending',
    metadata: {
      ...currentMeta,
      feedback_submitted: false,
      user_approved: false
    }
  };
}

  async onFeedbackSubmit(taskConfigId: string, answers: Record<string, any>): Promise<AiActionResult | null> {
    const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
    const taskConfig = config?.tasks.find(t => t.id === taskConfigId);
    if (!taskConfig?.feedback_prompt) return null;

    const savesTo = taskConfig.feedback_prompt.saves_to;
    const updatedCoachState = this.mergeIntoCoachState(savesTo, answers);

    this.coachState = updatedCoachState;
    this.context.coach_state = updatedCoachState;

    if (taskConfig.post_feedback_action) {
      return this.runAiAction(taskConfig.post_feedback_action);
    }

    return null;
  }

 canCompleteTask(taskConfigId: string, taskRow: Partial<Task>): GateCheckResult {
  const config = IRIS_PLAYBOOK[this.lead.status as LeadStage];
  const taskConfig = config?.tasks.find(t => t.id === taskConfigId);
  if (!taskConfig?.completion_gate) return { allowed: true };

  const taskMeta = (taskRow.metadata as Record<string, any>) || {};

  const ctx: EvalContext = {
    ...this.context,
    task: {
      ...taskRow,
      metadata: {
        ...taskMeta,
        feedback_submitted: taskMeta.feedback_submitted ?? false,
        user_approved: taskMeta.user_approved ?? false,
      }
    },
  };

  const allowed = evaluateCondition(taskConfig.completion_gate.condition, ctx);
  return allowed
    ? { allowed: true }
    : { allowed: false, message: taskConfig.completion_gate.blocked_message };
}

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
        conditionMet = this.hasNoTaskActivitySince(lastActivityDate);
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

      break;
    }

    return triggered;
  }

  async runAiAction(actionKey: string): Promise<AiActionResult | null> {
    const action = IRIS_RESOURCES.ai_actions[actionKey];
    if (!action) {
      console.warn(`[IrisOrchestrator] Unknown ai_action: ${actionKey}`);
      return null;
    }

    // 1. Compile the required context fields locally on the server
    const actionContext = this.buildActionContext(action.context_fields);

    // 2. Format context fields into structured string data lines
    const contextStr = Object.entries(actionContext)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');

    // 3. Match format rules exactly to prevent markdown block wrapping
    let formatStr: string;
    if (typeof action.output_format === 'string') {
      formatStr = `Return as: ${action.output_format}. Return ONLY valid JSON.`;
    } else {
      formatStr = `Return a JSON object with these exact keys: ${JSON.stringify(action.output_format)}. Return ONLY the JSON, no markdown fences or extra text.`;
    }

    const userMessage = `Context:\n${contextStr}\n\n${formatStr}`;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error('[IrisOrchestrator] Missing DEEPSEEK_API_KEY environment variable');
      return null;
    }

    try {
      // 4. Connect directly to DeepSeek, bypassing the relative endpoint hop
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: action.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: action.system_prompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[IrisOrchestrator] DeepSeek direct API error ${res.status}: ${errorText}`);
        return null;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';

      // 5. Clean up any accidental markdown code blocks returned by the model
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      try {
        return JSON.parse(cleaned);
      } catch {
        // Fallback response parsing for non-JSON returns
        return { body: text.trim() };
      }
    } catch (err) {
      console.error(`[IrisOrchestrator] Direct AI action execution failed for ${actionKey}:`, err);
      return null;
    }
  }

  private buildSuggestedTask(taskConfig: IrisTaskConfig, stage: LeadStage): Partial<Task> {
  const title = interpolateTemplate(taskConfig.title, this.context);
  const channel = this.resolveChannel(taskConfig);
  const dueDate = addBusinessDays(new Date(), taskConfig.due_business_days);

  let irisTip = taskConfig.iris_tip ? interpolateTemplate(taskConfig.iris_tip, this.context) : null;
  if (taskConfig.id === 'execute_spin_call' && (this.lead.ai_coach_state as any)?.ai_dossier?.contact_qualification_guide) {
    irisTip = (this.lead.ai_coach_state as any).ai_dossier.contact_qualification_guide;
  }

  return {
    lead_id: this.lead.id,
    stage,
    title,
    channel,
    due_date: dueDate.toISOString(),
    required: taskConfig.required,
    iris_tip: irisTip,
    type: 'task', // Sets polymorphic required discriminator
    metadata: {
      task_config_id: taskConfig.id,
      auto_prompt: taskConfig.feedback_prompt?.trigger === 'on_create',
    }
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
    else if (root === 'task') current = this.context.task ?? {};
    else if (root === 'user') current = this.context.user;
    else current = this.coachState?.[root];

    for (let i = 1; i < parts.length; i++) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  private mergeIntoCoachState(path: string, answers: Record<string, any>): CoachState {
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

  private getCompletedTaskConfigIds(): Set<string> {
  return new Set(
    this.existingTasks
      .filter(t => t.status === 'completed' && (t.metadata as any)?.task_config_id)
      .map(t => (t.metadata as any).task_config_id!)
  );
}

  private hasNoTaskActivitySince(since: Date): boolean {
    const activityCount = this.existingTasks.filter(t => {
      const date = new Date(t.completed_at || t.updated_at || t.created_at);
      return date > since;
    }).length;
    return activityCount === 0;
  }
}