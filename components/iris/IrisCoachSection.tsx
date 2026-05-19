'use client';

// components/iris/IrisCoachSection.tsx

import { useState, useTransition, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
    Sparkles,
    Mail,
    Phone,
    Calendar,
    FileText,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Loader2,
    Lock,
    ThumbsUp,
    Copy,
    Check,
    Edit2
} from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { cn } from '@/lib/utils';
import { 
    $activeLead, 
    $activeTasks, 
    $activeCoachLogs, 
    completeTaskOptimistic, 
    approveTaskOptimistic, 
    confirmStageTasksOptimistic,
    persistAiDraftOptimistic
} from '@/store/leadsStore'; // Browser-safe Nanostore layer
import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';
import { IRIS_RESOURCES } from '@/lib/iris/resources.config';
import { IrisFeedbackTrigger } from './IrisFeedbackPrompt';
import { formatDueDate, isPast } from '@/lib/iris/template-utils';
import type { TaskRow as StoreTaskRow, CoachLogRow } from '@/store/leadsStore';
import type { LeadStage } from '@/lib/iris/types';

const CHANNEL_ICON: Record<string, React.ElementType> = {
    email: Mail,
    linkedin: LinkedInIcon,
    phone: Phone,
    meeting: Calendar,
    internal: FileText,
    auto: Sparkles,
};

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
    draft_outreach_email: { label: 'Draft outreach email', icon: Mail },
    draft_linkedin_message: { label: 'Draft LinkedIn invitation', icon: LinkedInIcon },
    draft_followup_email: { label: 'Draft follow-up email', icon: Mail },
    draft_phone_script: { label: 'Generate call script', icon: Phone },
    draft_meeting_request: { label: 'Draft meeting request', icon: Calendar },
    draft_breakup_email: { label: 'Draft break-up email', icon: Mail },
    draft_value_email: { label: 'Draft product value email', icon: Mail },
    draft_contract_cover_email: { label: 'Draft contract cover letter', icon: Mail },
    suggest_case_study: { label: 'Suggest proof points', icon: FileText },
    suggest_meeting_agenda: { label: 'Structure call agenda', icon: Calendar },
    generate_proposal_draft: { label: 'Structure full proposal', icon: FileText },
    generate_deal_summary: { label: 'Generate deal summary SOW', icon: FileText },
    generate_onboarding_checklist: { label: 'Build onboarding steps', icon: CheckCircle2 },
    generate_objection_playbook: { label: 'Assemble objection responses', icon: Sparkles },
};

export default function IrisCoachSection() {
    const lead = useStore($activeLead);
    const tasks = useStore($activeTasks);
    const coachLogs = useStore($activeCoachLogs);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [localDrafts, setLocalDrafts] = useState<Record<string, any>>({});
    const [stagedTasks, setStagedTasks] = useState<any[] | null>(null);
    const [isConfirmingTasks, startConfirmTransition] = useTransition();

    const latestLog = coachLogs[0] || null;
    const stageConfig = lead ? IRIS_PLAYBOOK[lead.status] : null;
    
    // Filter live tasks explicitly active for this current tracking pipeline stage
    const stageTasks = tasks.filter(t => t.stage === lead?.status);

    // FIX: Read deep persistent database cached copies safely to protect from refreshes
    const dbCachedDrafts = (lead?.ai_coach_state as Record<string, any>)?.ai_drafts || {};
    const unifiedDrafts = { ...dbCachedDrafts, ...localDrafts };

    // FIX: Smart Playbook Fallback Initialization lifecycle hook
useEffect(() => {
    if (!lead) return;
    
    // If there are already active tasks in this stage, hide the staging card
    if (stageTasks.length > 0) {
        setStagedTasks(null);
        return;
    }

    // If it's a valid entry log and contains pre-calculated database suggested tasks, use them
    if (latestLog?.type === 'entry' && Array.isArray(latestLog.suggested_tasks) && latestLog.suggested_tasks.length > 0) {
        setStagedTasks(latestLog.suggested_tasks);
        return;
    }

    // FALLBACK: If it's a legacy lead row with empty logs, read directly from the playbook config
    const currentStageConfig = IRIS_PLAYBOOK[lead.status];
    if (currentStageConfig && stageTasks.length === 0) {
        // Map playbooks tokens to runtime staged task elements
        const fallbackTasks = currentStageConfig.tasks
            .filter(t => !t.depends_on?.length) // Target primary unblocked baseline tasks
            .map(t => ({
                lead_id: lead.id,
                stage: lead.status,
                task_config_id: t.id,
                title: t.title.replace('{{lead.company_name}}', lead.company_name || 'Company'),
                channel: t.channel === 'auto' ? 'email' : t.channel,
                due_date: new Date(Date.now() + t.due_business_days * 24 * 60 * 60 * 1000).toISOString(),
                required: t.required,
                iris_tip: t.iris_tip || null,
            }));
        
        setStagedTasks(fallbackTasks);
    } else {
        setStagedTasks(null);
    }
}, [latestLog, lead, stageTasks.length]);

    async function handleAiAction(actionKey: string) {
        if (!lead) return;
        const action = IRIS_RESOURCES.ai_actions[actionKey];
        if (!action) return;

        setLoadingAction(actionKey);
        try {
            const res = await fetch(action.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_key: actionKey, lead_id: lead.id }),
            });
            const data = await res.json();
            
            // Push locally for snappy feedback + trigger DB JSONB block cache update
            setLocalDrafts(prev => ({ ...prev, [actionKey]: data }));
            await persistAiDraftOptimistic(lead.id, actionKey, data);
        } catch {
            console.error('Failed to trigger generation context');
        } finally {
            setLoadingAction(null);
        }
    }

    async function handleConfirmStagedTasks() {
        if (!lead || !stagedTasks) return;
        startConfirmTransition(async () => {
            await confirmStageTasksOptimistic(lead.id, stagedTasks);
            setStagedTasks(null);
        });
    }

    if (!lead) return null;

    return (
        <div className="space-y-5">
            {/* Coach Label Identity */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 shadow-sm shadow-violet-500/10">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                    <span className="text-sm font-bold text-foreground">Iris</span>
                    <span className="text-xs text-muted-foreground ml-1.5">· AI Sales Director</span>
                </div>
                {stageConfig && (
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                        Goal: {stageConfig.goal}
                    </span>
                )}
            </div>

            {/* Latest Core Insight Feed */}
            {latestLog?.message && <IrisMessageCard log={latestLog} />}

            {/* FIX: Interactive Playbook Initialization Staging Preview Block Layout */}
            {stagedTasks && (
                <div className="rounded-2xl border border-violet-200 dark:border-violet-800/40 bg-violet-500/[0.02] p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" /> Confirm Upcoming Stage Playbook
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Review and tweak the standard initialization track scheduled for the <span className="font-semibold text-foreground capitalize">{lead.status}</span> stage.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {stagedTasks.map((st, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border/60 shadow-sm">
                                <div className="space-y-1 max-w-md">
                                    <p className="text-xs font-semibold text-foreground">{st.title}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <FileText className="h-3 w-3 shrink-0" />
                                        <span className="capitalize">{st.channel} Channel</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <input 
                                        type="date" 
                                        value={st.due_date ? st.due_date.split('T')[0] : ''} 
                                        onChange={(e) => {
                                            const updated = [...stagedTasks];
                                            updated[i].due_date = new Date(e.target.value).toISOString();
                                            setStagedTasks(updated);
                                        }}
                                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    />
                                    <select
                                        value={st.channel}
                                        onChange={(e) => {
                                            const updated = [...stagedTasks];
                                            updated[i].channel = e.target.value;
                                            setStagedTasks(updated);
                                        }}
                                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    >
                                        <option value="email">Email</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="phone">Phone</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="internal">Internal</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleConfirmStagedTasks}
                        disabled={isConfirmingTasks}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-semibold text-xs py-2.5 shadow-md shadow-violet-500/15 transition-all disabled:opacity-40"
                    >
                        {isConfirmingTasks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Commit & Unlock Playbook Tasks
                    </button>
                </div>
            )}

            {/* Render Stage Specific Tasks Tracker Loop */}
            {stageTasks.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Active Action Items · {lead.status}
                        </p>
                        <div className="h-px bg-border/60 flex-1" />
                    </div>
                    {stageTasks.map(task => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            lead={lead}
                            onAiAction={handleAiAction}
                            loadingAction={loadingAction}
                            unifiedDrafts={unifiedDrafts}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Iris Message Card ---
function IrisMessageCard({ log }: { log: CoachLogRow }) {
    const [expanded, setExpanded] = useState(true);
    return (
        <div className="rounded-2xl border border-border/50 bg-muted/30 dark:bg-muted/10 overflow-hidden shadow-sm">
            <button onClick={() => setExpanded(e => !e)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-muted/40 transition-colors">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <p className="flex-1 text-xs font-medium text-foreground leading-relaxed line-clamp-2">{log.message}</p>
                {expanded ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />}
            </button>
            {expanded && log.message && (
                <div className="px-5 pb-4 pt-1 animate-in fade-in duration-200">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{log.message}</p>
                </div>
            )}
            <div className="border-t border-border/40 px-5 py-2 bg-muted/10 dark:bg-muted/5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 capitalize">
                    {log.type.replace('_', ' ')} · {formatRelativeTime(log.created_at)}
                </span>
            </div>
        </div>
    );
}

// --- Task Row Card Framework ---
interface TaskRowProps {
    task: StoreTaskRow;
    lead: any;
    onAiAction: (key: string) => void;
    loadingAction: string | null;
    unifiedDrafts: Record<string, any>;
}

function TaskRow({ task, lead, onAiAction, loadingAction, unifiedDrafts }: TaskRowProps) {
    const [gateMessage, setGateMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const isCompleted = task.status === 'completed';
    const isOverdue = !isCompleted && task.due_date && isPast(task.due_date);
    const ChannelIcon = CHANNEL_ICON[task.channel] ?? FileText;

    const stageConfig = IRIS_PLAYBOOK[lead.status as LeadStage];
    const taskConfig = stageConfig?.tasks.find(t => t.id === task.task_config_id);

    function handleComplete() {
        if (!task.task_config_id) return;
        setGateMessage(null);
        startTransition(async () => {
            // Evaluates block conditions via store endpoints
            await completeTaskOptimistic(task.id, task.task_config_id!);
        });
    }

    function handleApprove() {
        startTransition(async () => {
            await approveTaskOptimistic(task.id);
        });
    }

    return (
        <div className={cn(
            'rounded-2xl border bg-background overflow-hidden transition-all duration-300 shadow-sm', 
            isCompleted 
                ? 'border-border/30 opacity-60' 
                : isOverdue 
                ? 'border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.01]' 
                : 'border-border/70 hover:border-border'
        )}>
            {/* Core Row Header Info */}
            <div className="flex items-start gap-4 px-5 py-4">
                <button 
                    onClick={handleComplete} 
                    disabled={isPending || isCompleted} 
                    className={cn(
                        'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center', 
                        isCompleted 
                            ? 'border-emerald-500 bg-emerald-500' 
                            : 'border-border hover:border-violet-500 hover:bg-violet-500/5',
                        'disabled:cursor-not-allowed'
                    )}
                >
                    {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> 
                    ) : isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" /> 
                    ) : null}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('text-xs font-semibold leading-snug', isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>{task.title}</p>
                        {task.required && !isCompleted && (
                            <span className="rounded-full bg-violet-500/10 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400 border border-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                Required
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <ChannelIcon className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="capitalize">{task.channel}</span>
                        <span>·</span>
                        <span className={cn(isOverdue && !isCompleted && 'text-rose-500 font-semibold')}>{task.due_date ? formatDueDate(task.due_date) : 'No deadline'}</span>
                        {isOverdue && !isCompleted && <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />}
                    </div>
                    {task.iris_tip && !isCompleted && (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl border border-border/30 mt-1.5 leading-relaxed">
                            💡 <span className="font-medium">Iris Tip:</span> {task.iris_tip}
                        </p>
                    )}
                </div>
            </div>

            {/* Block Gates Notification Banner */}
            {gateMessage && (
                <div className="flex items-center gap-2 border-t border-rose-100 bg-rose-500/[0.02] px-5 py-2.5">
                    <Lock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{gateMessage}</p>
                </div>
            )}

            {/* Requires User Approval Verification Gate */}
            {taskConfig?.requires_user_approval && !task.user_approved && !isCompleted && (
                <div className="border-t border-border/40 px-5 py-3 bg-amber-500/[0.02] flex items-center justify-between gap-4">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-400 leading-normal">
                        {taskConfig.approval_message ?? 'Review and approve before marking complete.'}
                    </p>
                    <button 
                        onClick={handleApprove} 
                        disabled={isPending} 
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 hover:bg-amber-200 transition-all cursor-pointer shadow-sm active:scale-98"
                    >
                        <ThumbsUp className="h-3.5 w-3.5" /> Approve Artifact
                    </button>
                </div>
            )}

            {/* FIX: Contextual AI Actions Expansion Trigger Hub */}
            {!isCompleted && taskConfig?.ai_actions?.length && (
                <div className="flex flex-col border-t border-border/40 bg-muted/10">
                    <div className="flex flex-wrap gap-2 px-5 py-2.5">
                        {taskConfig.ai_actions.map(actionKey => {
                            const def = ACTION_LABELS[actionKey];
                            if (!def) return null;
                            const Icon = def.icon;
                            const isDone = Boolean(unifiedDrafts[actionKey] && !unifiedDrafts[actionKey].error);
                            const isCurrentLoading = loadingAction === actionKey;

                            return (
                                <button
                                    key={actionKey}
                                    onClick={() => onAiAction(actionKey)}
                                    disabled={isCurrentLoading || isDone}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed shadow-sm',
                                        isDone
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400'
                                            : 'border-border bg-background text-foreground hover:bg-muted/80'
                                    )}
                                >
                                    {isCurrentLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" /> 
                                    ) : isDone ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 
                                    ) : (
                                        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                                    )}
                                    {def.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* FIX: Inline AI Draft Asset Context Rendering Panels */}
                    <div className="px-5 pb-4 space-y-3">
                        {taskConfig.ai_actions.map(actionKey => {
                            const content = unifiedDrafts[actionKey];
                            if (!content) return null;

                            return (
                                <div key={actionKey} className="rounded-xl border border-border/70 bg-background shadow-inner overflow-hidden animate-in fade-in duration-300">
                                    <div className="border-b border-border/40 px-4 py-2 bg-muted/40 flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Iris Preview · {ACTION_LABELS[actionKey]?.label || actionKey}
                                        </p>
                                    </div>
                                    
                                    {content.subject && content.body ? (
                                        <div className="p-4 space-y-3 select-text">
                                            <div className="text-xs bg-muted/30 p-2 rounded-lg border border-border/40">
                                                <span className="font-bold text-muted-foreground">Subject:</span> <span className="font-semibold text-foreground">{content.subject}</span>
                                            </div>
                                            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{content.body}</p>
                                            <ClipboardButton text={`Subject: ${content.subject}\n\n${content.body}`} />
                                        </div>
                                    ) : content.playbook && Array.isArray(content.playbook) ? (
                                        <div className="divide-y divide-border/40">
                                            {content.playbook.map((item: any, i: number) => (
                                                <div key={i} className="p-4 space-y-1.5 select-text">
                                                    <p className="text-xs font-bold text-foreground">Objection: "{item.objection}"</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground/80">Iris Reframe:</span> {item.reframe}</p>
                                                    {item.question && <p className="text-xs text-violet-600 dark:text-violet-400 font-medium italic">Pivot Question: "{item.question}"</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 select-text">
                                            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap overflow-x-auto bg-muted/20 p-3 rounded-lg border border-border/40">{JSON.stringify(content, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Inline Conversational Question Trigger Loop */}
            {!isCompleted && taskConfig?.feedback_prompt && (
                <div className="border-t border-border/40 px-5 pb-4 pt-1 bg-muted/5">
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

// --- Clipboard copy helper button ---
function ClipboardButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (
        <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[10px] font-bold bg-background text-muted-foreground hover:text-foreground shadow-sm transition-all cursor-pointer active:scale-95"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied to Clipboard' : 'Copy Draft Content'}
        </button>
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