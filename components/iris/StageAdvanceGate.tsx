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
        const { criteriaResults, blockedMessage } = await getExitCriteriaResults({
            leadId: lead.id,
            currentStage: lead.status as LeadStage, // cast to the union type
        });
        setGateData({ targetStage: targetStage as LeadStage, criteriaResults, blockedMessage });
        setGateOpen(true);
    }

    async function handleConfirm() {
        if (!gateData) return;
        startTransition(async () => {
            await updateLeadStatus(gateData.targetStage);
            setGateOpen(false);
            setGateData(null);
        });
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-1">
                {STAGE_ORDER.map(stage => (
                    <button
                        key={stage}
                        onClick={() => handleStageSelect(stage)}
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium transition-all',
                            stage === lead.status
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        )}
                    >
                        {STAGE_LABELS[stage]}
                    </button>
                ))}
            </div>

            {gateOpen && gateData && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setGateOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-50">
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
                </>
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
    const isSkippingForward = STAGE_ORDER.indexOf(targetStage) - STAGE_ORDER.indexOf(currentStage) > 1;

    return (
        <div className="w-80 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-violet-50/60 dark:bg-violet-950/20">
                <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Iris — stage check</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{STAGE_LABELS[currentStage]}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{STAGE_LABELS[targetStage]}</span>
                {isSkippingForward && <span className="ml-auto flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" />Skipping</span>}
            </div>

            {criteriaResults.length > 0 && (
                <div className="divide-y divide-border/30">
                    {passed.map(c => <CriterionRow key={c.condition} result={c} />)}
                    {missing.map(c => <CriterionRow key={c.condition} result={c} />)}
                </div>
            )}

            {!allPassed && irisBlockedMessage && (
                <div className="px-4 py-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Iris: </span>{irisBlockedMessage}</p>
                </div>
            )}

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/40">
                <button onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60">Cancel</button>
                {allPassed ? (
                    <button onClick={onConfirm} disabled={isPending} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                        {isPending ? 'Moving…' : `Move to ${STAGE_LABELS[targetStage]}`}
                    </button>
                ) : (
                    <button onClick={onConfirm} disabled={isPending} className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-40">
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {isPending ? 'Moving…' : 'Override & advance'}
                    </button>
                )}
            </div>
        </div>
    );
}

function CriterionRow({ result }: { result: CriterionResult }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            {result.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-400" />}
            <span className={cn('text-sm', result.passed ? 'text-foreground' : 'text-muted-foreground')}>{result.label}</span>
        </div>
    );
}