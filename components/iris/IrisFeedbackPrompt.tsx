'use client';

/**
 * IrisFeedbackPrompt
 *
 * Renders Iris's post-task feedback questions and submits answers back to
 * the orchestrator. Sits inside the ActivityFeed / task row when a task is
 * marked complete and the config has a feedback_prompt defined.
 *
 * Props come directly from the task's FeedbackPrompt config object so the
 * component itself has zero hardcoded sales logic.
 */

import { useState, useTransition } from 'react';
import { CheckCircle, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitFeedbackOptimistic } from '@/store/leadsStore';
import type { FeedbackPrompt, FeedbackQuestion } from '@/lib/iris/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string | string[]>;

interface IrisFeedbackPromptProps {
  taskConfigId: string;       // matches task.task_config_id
  leadId: string;
  prompt: FeedbackPrompt;
  /** Called after successful submission with the collected answers */
  onComplete?: (answers: Answers) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IrisFeedbackPrompt({
  taskConfigId,
  leadId,
  prompt,
  onComplete,
  className,
}: IrisFeedbackPromptProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Track which question the user is currently on for progressive reveal
  const [activeIndex, setActiveIndex] = useState(0);

  const allAnswered = prompt.questions.every(q => {
    if (q.type === 'action') return true;
    return answers[q.id] !== undefined && answers[q.id] !== '';
  });

  function handleSelect(questionId: string, value: string, multiSelect: boolean) {
    setAnswers(prev => {
      if (multiSelect) {
        const current = (prev[questionId] as string[]) ?? [];
        const next = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: value };
    });

    // Advance to next question automatically on single-select
    if (!multiSelect) {
      const nextIdx = activeIndex + 1;
      if (nextIdx < prompt.questions.length) {
        setTimeout(() => setActiveIndex(nextIdx), 180);
      }
    }
  }

  function handleTextChange(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitFeedbackOptimistic(leadId, taskConfigId, answers, prompt.saves_to);
      setSubmitted(true);
      onComplete?.(answers);
    });
  }

  if (submitted) {
    return (
      <div className={cn('flex items-center gap-2 py-3 text-sm text-muted-foreground', className)}>
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>Logged. Iris will update her recommendation.</span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/30 overflow-hidden', className)}>
      {/* Iris header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-violet-50/60 dark:bg-violet-950/20">
        <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
          Iris — quick debrief
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {prompt.questions.filter(q => q.type !== 'action').length} questions
        </span>
      </div>

      {/* Questions */}
      <div className="divide-y divide-border/40">
        {prompt.questions.map((question, idx) => (
          <FeedbackQuestion
            key={question.id}
            question={question}
            answer={answers[question.id]}
            isActive={idx <= activeIndex}
            onSelect={(val, multi) => handleSelect(question.id, val, multi)}
            onTextChange={(val) => handleTextChange(question.id, val)}
          />
        ))}
      </div>

      {/* Submit */}
      {activeIndex >= prompt.questions.length - 1 && (
        <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {allAnswered
              ? 'Ready — your answers shape Iris\'s next recommendation.'
              : 'Answer all questions to continue.'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              'bg-violet-600 text-white hover:bg-violet-700 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
            )}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {isPending ? 'Saving…' : 'Done'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Individual question renderer ─────────────────────────────────────────────

interface FeedbackQuestionProps {
  question: FeedbackQuestion;
  answer: string | string[] | undefined;
  isActive: boolean;
  onSelect: (value: string, multiSelect: boolean) => void;
  onTextChange: (value: string) => void;
}

function FeedbackQuestion({
  question,
  answer,
  isActive,
  onSelect,
  onTextChange,
}: FeedbackQuestionProps) {
  if (!isActive) return null;

  const isMulti = Boolean(question.multi_select);
  const selectedValues = Array.isArray(answer) ? answer : answer ? [answer] : [];

  return (
    <div className="px-4 py-3 space-y-2.5">
      <p className="text-sm font-medium text-foreground leading-snug">
        {question.text}
      </p>

      {/* Option buttons */}
      {question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map(option => {
            const isSelected = selectedValues.includes(option);
            return (
              <button
                key={option}
                onClick={() => onSelect(option, isMulti)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-all active:scale-95',
                  isSelected
                    ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'border-border bg-background text-foreground hover:border-border/80 hover:bg-muted/60'
                )}
              >
                {isMulti && (
                  <span className={cn(
                    'mr-1.5 inline-block h-3 w-3 rounded-sm border align-middle',
                    isSelected ? 'border-violet-500 bg-violet-500' : 'border-border'
                  )} />
                )}
                {option}
              </button>
            );
          })}
        </div>
      )}

      {/* Multi-select hint */}
      {isMulti && (
        <p className="text-xs text-muted-foreground">Select all that apply</p>
      )}

      {/* Free text input */}
      {question.type === 'text' && (
        <input
          type="text"
          value={(answer as string) ?? ''}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Type your answer…"
          className={cn(
            'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30',
            'transition-colors'
          )}
        />
      )}

      {/* Action button (links to another part of the UI) */}
      {question.type === 'action' && (
        <p className="text-xs text-muted-foreground italic">
          → {question.text}
        </p>
      )}
    </div>
  );
}

// ─── Inline trigger (appears on task row when task is completed) ──────────────

/**
 * Wraps the feedback prompt with a task-row inline expansion pattern.
 * Shows a "Quick debrief" button that expands into the prompt.
 */
export function IrisFeedbackTrigger({
  taskConfigId,
  leadId,
  prompt,
  onComplete,
}: {
  taskConfigId: string;
  leadId: string;
  prompt: FeedbackPrompt;
  onComplete?: (answers: Answers) => void;
}) {
  const [expanded, setExpanded] = useState(
    // Auto-expand if the prompt fires on_create
    prompt.trigger === 'on_create'
  );

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors mt-1"
      >
        <Sparkles className="h-3 w-3" />
        Iris has a quick question
        <ChevronRight className="h-3 w-3" />
      </button>
    );
  }

  return (
    <IrisFeedbackPrompt
      taskConfigId={taskConfigId}
      leadId={leadId}
      prompt={prompt}
      onComplete={onComplete}
      className="mt-2"
    />
  );
}