'use client';

// components/iris/StageAdvanceGate.tsx

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getExitCriteriaResults } from '@/app/actions/iris';
import { updateLeadStatus } from '@/store/leadsStore'; // use store action
import type { CriterionResult } from '@/lib/iris/condition-evaluator';
import type { Lead, LeadStage } from '@/lib/iris/types';

const STAGE_LABELS: Record<string, string> = {
    new: 'New', contacted: 'Contacted', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const STAGE_ORDER = ['new', 'contacted', 'proposal', 'negotiation', 'won'];

interface StageSelectorProps {
    lead: Lead;
    coachState: Record<string, any>;
}

export function StageSelector({ lead, coachState }: StageSelectorProps) {
    const [gateOpen, setGateOpen] = useState(false);
    const [gateData, setGateData] = useState<{
        targetStage: LeadStage;
        criteriaResults: CriterionResult[];
        blockedMessage?: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    async function handleStageSelect(targetStage: string) {
        if (targetStage === lead.status) return;
        
        // Fetch fresh evaluation matrix server-side
        const { criteriaResults, blockedMessage } = await getExitCriteriaResults({
            leadId: lead.id,
            currentStage: lead.status as LeadStage,
        });
        
        setGateData({ targetStage: targetStage as LeadStage, criteriaResults, blockedMessage });
        setGateOpen(true);
    }

    async function handleConfirm() {
        if (!gateData) return;
        startTransition(async () => {
            await updateLeadStatus(gateData.targetStage); // Persists via store abstraction
            setGateOpen(false);
            setGateData(null);
        });
    }

    return (
        <div className="w-full">
            {/* Ribbon Track Layout */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40">
                {STAGE_ORDER.map((stage, idx) => {
                    const isActive = stage === lead.status;
                    const isPassed = STAGE_ORDER.indexOf(lead.status) > STAGE_ORDER.indexOf(stage);
                    
                    return (
                        <div key={stage} className="flex items-center gap-1">
                            <button
                                onClick={() => handleStageSelect(stage)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none',
                                    isActive
                                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                                        : isPassed
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 hover:bg-emerald-500/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >
                                {STAGE_LABELS[stage]}
                            </button>
                            {idx < STAGE_ORDER.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mx-0.5" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Centered Modal Guard Overlay */}
            {gateOpen && gateData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop Layer */}
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
                        onClick={() => !isPending && setGateOpen(false)} 
                    />
                    
                    {/* Modal Box Container */}
                    <div className="relative z-10 w-full max-w-md transform scale-100 transition-all duration-300 animate-in zoom-in-95 ease-out">
                        <StageAdvanceGate
                            currentStage={lead.status}
                            targetStage={gateData.targetStage}
                            criteriaResults={gateData.criteriaResults}
                            irisBlockedMessage={gateData.blockedMessage}
                            onConfirm={handleConfirm}
                            onCancel={() => setGateOpen(false)}
                            isPending={isPending}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

interface StageAdvanceGateProps {
    currentStage: string;
    targetStage: string;
    criteriaResults: CriterionResult[];
    irisBlockedMessage?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isPending: boolean;
}

function StageAdvanceGate({
    currentStage,
    targetStage,
    criteriaResults,
    irisBlockedMessage,
    onConfirm,
    onCancel,
    isPending,
}: StageAdvanceGateProps) {
    const passed = criteriaResults.filter(c => c.passed);
    const missing = criteriaResults.filter(c => !c.passed);
    const allPassed = missing.length === 0;
    
    // Detect multi-stage forward loops
    const isSkippingForward = STAGE_ORDER.indexOf(targetStage) - STAGE_ORDER.indexOf(currentStage) > 1;

    return (
        <div className="w-full rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col">
            {/* Header Identity Bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 bg-violet-50/60 dark:bg-violet-950/20">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    Iris — Pipeline Stage Gate Verification
                </span>
            </div>

            {/* Transition Indicator Track */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/20">
                <span className="rounded-lg bg-background border border-border px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                    {STAGE_LABELS[currentStage]}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                <span className="rounded-lg bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800/40 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-sm">
                    {STAGE_LABELS[targetStage]}
                </span>
                {isSkippingForward && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium border border-amber-500/20">
                        <AlertTriangle className="h-3 w-3" /> Skipping Stages
                    </span>
                )}
            </div>

            {/* Criteria Evaluation Checklist */}
            <div className="max-h-60 overflow-y-auto divide-y divide-border/40 bg-background/50">
                {criteriaResults.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground italic">
                        No automated exit requirements mapped for this stage transition.
                    </div>
                ) : (
                    <>
                        {passed.map(c => <CriterionRow key={c.condition} result={c} />)}
                        {missing.map(c => <CriterionRow key={c.condition} result={c} />)}
                    </>
                )}
            </div>

            {/* Iris Guidance Commentary Callout */}
            {!allPassed && irisBlockedMessage && (
                <div className="px-5 py-4 border-t border-border/40 bg-amber-500/[0.03] flex gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Playbook Warning</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{irisBlockedMessage}</p>
                    </div>
                </div>
            )}

            {/* Interactive Control Options */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border/40 bg-muted/10">
                <button 
                    onClick={onCancel} 
                    disabled={isPending}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                >
                    Cancel
                </button>
                
                {allPassed ? (
                    <button 
                        onClick={onConfirm} 
                        disabled={isPending} 
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 active:scale-98 disabled:opacity-40 transition-all shadow-md shadow-violet-500/10"
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {isPending ? 'Syncing Stage…' : `Confirm Transition`}
                    </button>
                ) : (
                    <button 
                        onClick={onConfirm} 
                        disabled={isPending} 
                        className="flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-500/5 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 active:scale-98 disabled:opacity-40 transition-all shadow-sm"
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {isPending ? 'Syncing Stage…' : 'Override & Advance'}
                    </button>
                )}
            </div>
        </div>
    );
}

function CriterionRow({ result }: { result: CriterionResult }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-5 py-3 transition-colors",
            result.passed ? "bg-emerald-500/[0.01]" : "bg-rose-500/[0.01]"
        )}>
            {result.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span className={cn(
                'text-xs font-medium leading-normal', 
                result.passed ? 'text-foreground' : 'text-muted-foreground line-clamp-2'
            )}>
                {result.label}
            </span>
        </div>
    );
}