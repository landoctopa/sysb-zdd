'use client';

import { useState, useTransition } from 'react';
import { useStore } from '@nanostores/react';
import {
    Sparkles,
    Mail,
    Phone,
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Loader2,
    Lock,
    ThumbsUp
} from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { cn } from '@/lib/utils';
import { $activeLead, $activeTasks, $activeCoachLogs, completeTaskOptimistic, approveTaskOptimistic, submitFeedbackOptimistic, confirmStageTasksOptimistic } from '@/store/leadsStore';
import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';
import { IRIS_RESOURCES } from '@/lib/iris/resources.config';
import { IrisFeedbackTrigger } from './IrisFeedbackPrompt';
import { formatDueDate, isPast } from '@/lib/iris/template-utils';
import type { TaskRow, CoachLogRow, LeadRow } from '@/store/leadsStore';
import type { LeadStage } from '@/lib/iris/types';

// Channel icon mapping
const CHANNEL_ICON: Record<string, React.ElementType> = {
    email: Mail,
    linkedin: LinkedInIcon,
    phone: Phone,
    meeting: Calendar,
    internal: FileText,
    auto: Sparkles,
};

// AI action button labels
const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
    draft_outreach_email: { label: 'Draft email', icon: Mail },
    draft_linkedin_message: { label: 'Draft LinkedIn', icon: LinkedInIcon },
    draft_followup_email: { label: 'Follow-up', icon: Mail },
    draft_phone_script: { label: 'Call script', icon: Phone },
    draft_meeting_request: { label: 'Request meeting', icon: Calendar },
    draft_breakup_email: { label: 'Break-up email', icon: Mail },
    draft_value_email: { label: 'Value email', icon: Mail },
    draft_contract_cover_email: { label: 'Cover email', icon: Mail },
    suggest_case_study: { label: 'Suggest case study', icon: FileText },
    suggest_meeting_agenda: { label: 'Suggest agenda', icon: Calendar },
    generate_proposal_draft: { label: 'Generate proposal', icon: FileText },
    generate_deal_summary: { label: 'Generate summary', icon: FileText },
    generate_onboarding_checklist: { label: 'Onboarding tasks', icon: CheckCircle2 },
    generate_objection_playbook: { label: 'Objection playbook', icon: Sparkles },
};

export default function IrisCoachSection() {
    const lead = useStore($activeLead);
    const tasks = useStore($activeTasks);
    const coachLogs = useStore($activeCoachLogs);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<Record<string, any>>({});
    const [isConfirmingTasks, startConfirmTransition] = useTransition();

    const latestLog = coachLogs[0] || null;
    const stageConfig = lead ? IRIS_PLAYBOOK[lead.status] : null;
    const stageTasks = tasks.filter(t => t.stage === lead?.status);

    async function handleAiAction(actionKey: string) {
        const action = IRIS_RESOURCES.ai_actions[actionKey];
        if (!action || !lead) return;

        setLoadingAction(actionKey);
        try {
            const res = await fetch(action.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action_key: actionKey,
                    lead_id: lead.id,
                }),
            });
            const data = await res.json();
            setGeneratedContent(prev => ({ ...prev, [actionKey]: data }));
        } finally {
            setLoadingAction(null);
        }
    }

    async function handleConfirmTasks(suggestedTasks: any[]) {
        if (!lead) return;
        startConfirmTransition(async () => {
            await confirmStageTasksOptimistic(lead.id, suggestedTasks);
        });
    }

    if (!lead) return null;

    return (
        <div className="space-y-4">
            {/* Iris header */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-foreground">Iris</span>
                <span className="text-xs text-muted-foreground">· AI sales coach</span>
                {stageConfig && (
                    <span className="ml-auto text-xs text-muted-foreground">Goal: {stageConfig.goal}</span>
                )}
            </div>

            {/* Latest Iris message */}
            {latestLog?.message && <IrisMessageCard log={latestLog} />}

            {/* Entry message with task confirmation (if any suggested tasks not yet created) */}
            {/* This would need to be handled by storing pending suggestions in state or checking if tasks exist */}
            {/* For now, assume tasks are already created or we'll show a separate prompt */}

            {/* Suggested actions from latest log */}
            {latestLog?.suggested_actions && latestLog.suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {latestLog.suggested_actions.map((actionKey: string) => (
                        <AiActionButton
                            key={actionKey}
                            actionKey={actionKey}
                            isLoading={loadingAction === actionKey}
                            result={generatedContent[actionKey]}
                            onClick={() => handleAiAction(actionKey)}
                        />
                    ))}
                </div>
            )}

            {/* Generated content panels */}
            {Object.entries(generatedContent).map(([key, content]) => (
                <GeneratedContentPanel key={key} actionKey={key} content={content} />
            ))}

            {/* Task list */}
            {stageTasks.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tasks · {lead.status}
                    </p>
                    {stageTasks.map(task => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            lead={lead}
                            onAiAction={handleAiAction}
                            loadingAction={loadingAction}
                            generatedContent={generatedContent}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Iris message card ---
function IrisMessageCard({ log }: { log: CoachLogRow }) {
    const [expanded, setExpanded] = useState(true);
    return (
        <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 dark:border-violet-800/40 dark:bg-violet-950/20 overflow-hidden">
            <button onClick={() => setExpanded(e => !e)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                <p className="flex-1 text-sm text-foreground leading-relaxed line-clamp-2">{log.message}</p>
                {expanded ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />}
            </button>
            {expanded && log.message && log.message.length > 120 && (
                <div className="px-4 pb-3">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{log.message}</p>
                </div>
            )}
            <div className="border-t border-violet-200/40 px-4 py-1.5 dark:border-violet-800/30">
                <span className="text-xs text-muted-foreground capitalize">
                    {log.type.replace('_', ' ')} · {formatRelativeTime(log.created_at)}
                </span>
            </div>
        </div>
    );
}

// --- AI action button ---
function AiActionButton({ actionKey, isLoading, result, onClick }: { actionKey: string; isLoading: boolean; result: any; onClick: () => void }) {
    const def = ACTION_LABELS[actionKey];
    if (!def) return null;
    const Icon = def.icon;
    const isDone = Boolean(result);
    return (
        <button
            onClick={onClick}
            disabled={isLoading || isDone}
            className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all active:scale-95',
                isDone
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'border-border bg-background text-foreground hover:bg-muted/60',
                'disabled:cursor-not-allowed'
            )}
        >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            {def.label}
        </button>
    );
}

// --- Generated content panel ---
function GeneratedContentPanel({ actionKey, content }: { actionKey: string; content: any }) {
    if (!content) return null;
    const label = ACTION_LABELS[actionKey]?.label || actionKey;
    if (content.subject && content.body) {
        return (
            <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="border-b border-border/60 px-4 py-2 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Draft — {label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{content.subject}</p>
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content.body}</p>
                </div>
                <div className="border-t border-border/60 px-4 py-2 flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(`Subject: ${content.subject}\n\n${content.body}`)} className="text-xs text-muted-foreground hover:text-foreground">Copy</button>
                </div>
            </div>
        );
    }
    if (content.playbook && Array.isArray(content.playbook)) {
        return (
            <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="border-b border-border/60 px-4 py-2 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Objection playbook</p>
                </div>
                <div className="divide-y divide-border/40">
                    {content.playbook.map((item: any, i: number) => (
                        <div key={i} className="px-4 py-3 space-y-1">
                            <p className="text-sm font-medium text-foreground">{item.objection}</p>
                            <p className="text-sm text-muted-foreground">{item.reframe}</p>
                            {item.question && <p className="text-xs text-violet-600 italic">Ask: "{item.question}"</p>}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>
        </div>
    );
}

// --- Task row ---
function TaskRow({ task, lead, onAiAction, loadingAction, generatedContent }: { task: TaskRow; lead: LeadRow; onAiAction: (key: string) => void; loadingAction: string | null; generatedContent: Record<string, any> }) {
    const [gateMessage, setGateMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const isCompleted = task.status === 'completed';
    const isOverdue = !isCompleted && isPast(task.due_date);
    const ChannelIcon = CHANNEL_ICON[task.channel] ?? FileText;

    const stageConfig = IRIS_PLAYBOOK[lead.status as LeadStage];
    const taskConfig = stageConfig?.tasks.find(t => t.id === task.task_config_id);

    function handleComplete() {
        if (!task.task_config_id) return;
        setGateMessage(null);
        startTransition(async () => {
            await completeTaskOptimistic(task.id, task.task_config_id!);
        });
    }

    function handleApprove() {
        startTransition(async () => {
            await approveTaskOptimistic(task.id);
        });
    }

    return (
        <div className={cn('rounded-xl border bg-background overflow-hidden transition-all', isCompleted ? 'border-border/40 opacity-60' : isOverdue ? 'border-rose-200 dark:border-rose-800/50' : 'border-border')}>
            <div className="flex items-start gap-3 px-4 py-3">
                <button onClick={handleComplete} disabled={isPending || isCompleted} className={cn('mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-all', isCompleted ? 'border-emerald-400 bg-emerald-400' : 'border-border hover:border-violet-400', 'disabled:cursor-not-allowed')}>
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground m-auto" /> : isCompleted ? <CheckCircle2 className="h-4 w-4 text-white m-auto" /> : null}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('text-sm font-medium', isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>{task.title}</p>
                        {task.required && !isCompleted && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">Required</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <ChannelIcon className="h-3 w-3 shrink-0" />
                        <span className="capitalize">{task.channel}</span>
                        <span>·</span>
                        <span className={cn(isOverdue && !isCompleted && 'text-rose-500')}>{formatDueDate(task.due_date)}</span>
                        {isOverdue && !isCompleted && <AlertCircle className="h-3 w-3 text-rose-500" />}
                    </div>
                    {task.iris_tip && !isCompleted && <p className="mt-1.5 text-xs text-muted-foreground italic">{task.iris_tip}</p>}
                </div>
            </div>
            {gateMessage && (
                <div className="flex items-center gap-2 border-t border-rose-200/60 bg-rose-50/40 px-4 py-2">
                    <Lock className="h-3.5 w-3.5 text-rose-500" />
                    <p className="text-xs text-rose-700">{gateMessage}</p>
                </div>
            )}
            {taskConfig?.requires_user_approval && !task.user_approved && !isCompleted && (
                <div className="border-t border-border/40 px-4 py-2 bg-amber-50/30">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-700">{taskConfig.approval_message ?? 'Review and approve before marking complete.'}</p>
                        <button onClick={handleApprove} disabled={isPending} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200">
                            <ThumbsUp className="h-3 w-3" /> Approve
                        </button>
                    </div>
                </div>
            )}
            {!isCompleted && taskConfig?.ai_actions?.length && (
                <div className="flex flex-wrap gap-2 border-t border-border/40 px-4 py-2.5">
                    {taskConfig.ai_actions.map(actionKey => (
                        <AiActionButton key={actionKey} actionKey={actionKey} isLoading={loadingAction === actionKey} result={generatedContent[actionKey]} onClick={() => onAiAction(actionKey)} />
                    ))}
                </div>
            )}
            {!isCompleted && taskConfig?.feedback_prompt && (
                <div className="border-t border-border/40 px-4 pb-3 pt-1">
                    <IrisFeedbackTrigger
                        taskConfigId={task.task_config_id!}
                        leadId={lead.id}
                        prompt={taskConfig.feedback_prompt}
                        onComplete={() => { }}
                    />
                </div>
            )}
        </div>
    );
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.round(diffHrs / 24);
    return `${diffDays}d ago`;
}