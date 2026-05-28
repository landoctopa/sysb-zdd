'use client';
// components/leads/DiscoveryStageWorkspace.tsx

import React, { useState, useTransition } from 'react';
import {
    Sparkles,
    CheckCircle2,
    HelpCircle,
    Loader2,
    Search,
    UserPlus,
    Check,
    Mail,
    MessageSquare,
    FileSpreadsheet,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Database } from '@/database.types';
import { LinkedInIcon } from '@/components/icons/LinkedIn';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface DiscoveryWorkspaceProps {
    lead: Lead;
    actions: Action[];
    contacts: Contact[];
    onActionUpdated: (action: Action) => void;
    onActionCreated: (action: Action) => void;
}

export default function DiscoveryStageWorkspace({
    lead,
    actions,
    contacts,
    onActionUpdated,
    onActionCreated
}: DiscoveryWorkspaceProps) {
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>('verify_company_details');
    const [isAiLoading, startAiTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();

    // Local form state for logging your discovery conversation fit check
    const [fitScore, setFitScore] = useState<number | null>(null);
    const [financialImpact, setFinancialImpact] = useState('');

    // AI draft cache slots
    const [generatedDraft, setGeneratedDraft] = useState<{ subject?: string; body?: string; message?: string } | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<'email' | 'linkedin'>('email');

    // Filter tasks tied directly to your unified ledger setup
    const discoveryTasks = actions.filter(a => a.stage === 'discovery' && a.type === 'task');
    const pendingTasks = discoveryTasks.filter(t => t.status === 'pending');

    // 1. Generic Inline Task Completion Committer
    const handleCompleteTask = (task: Action, customMeta: Record<string, any> = {}) => {
        const toastId = toast.loading('Saving your milestone...');
        const currentMeta = (task.metadata as Record<string, any>) || {};

        startSaveTransition(async () => {
            try {
                const response = await fetch(`/api/actions/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        metadata: { ...currentMeta, ...customMeta }
                    }),
                });

                if (!response.ok) throw new Error('Update failed');
                const updated = await response.json();

                onActionUpdated(updated);
                toast.success('Task checked off successfully!', { id: toastId });

                // Find next pending item to keep the momentum going smoothly
                const nextPending = pendingTasks.find(t => t.id !== task.id);
                setExpandedTaskId(nextPending ? (nextPending.metadata as any)?.task_config_id : null);
            } catch (err) {
                toast.error('Could not save your changes. Try again.', { id: toastId });
            }
        });
    };

    // 2. Automated AI Generation Dispatcher
    const handleTriggerAiAction = (task: Action) => {
        setGeneratedDraft(null);
        const toastId = toast.loading('Iris is writing your custom outreach notes...');

        startAiTransition(async () => {
            try {
                const response = await fetch('/api/iris/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: lead.id,
                        action_key: selectedChannel === 'email' ? 'draft_outreach_email' : 'draft_linkedin_message',
                        task_id: task.id
                    }),
                });

                if (!response.ok) throw new Error('Generation failed');
                const result = await response.json();

                setGeneratedDraft(result);
                toast.success('Your personalized draft is ready below!', { id: toastId });
            } catch (err) {
                toast.error('Iris was unable to generate a blueprint right now.', { id: toastId });
            }
        });
    };

    return (
        <div className="space-y-4">

            {/* SUPPORTIVE INTRODUCTORY BRIEFING PANEL */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs space-y-1">
                    <span className="font-bold text-foreground">Next Operational Steps:</span>
                    <p className="text-muted-foreground leading-relaxed">
                        Let&apos;s build out your foundation for <span className="text-foreground font-semibold">{lead.company_name || 'this client'}</span>.
                        Review company baselines, lock down at least 2 distinct contact pathways to protect yourself from communication drops, and log your conversation fit parameters below.
                    </p>
                </div>
            </div>

            {/* RENDER TASKS CONTEXTUALLY */}
            {pendingTasks.length === 0 ? (
                <Card className="p-8 text-center text-xs text-muted-foreground border-dashed flex flex-col items-center gap-2.5 bg-card">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    <div className="space-y-0.5">
                        <span className="font-bold text-foreground block">Discovery preparation checklist complete!</span>
                        <span>Review your summary data panels or use the visual header bar to advance this deal whenever you are ready.</span>
                    </div>
                </Card>
            ) : (
                pendingTasks.map((task) => {
                    const configId = (task.metadata as any)?.task_config_id || '';
                    const isExpanded = expandedTaskId === configId;

                    return (
                        <Card key={task.id} className={`border transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-primary/40 bg-card' : 'border-border/60 hover:border-border/100'}`}>

                            {/* HEADER CLICK TRIGGER ROW */}
                            <div
                                onClick={() => setExpandedTaskId(isExpanded ? null : configId)}
                                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 select-none"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${isExpanded ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
                                    <span className="font-bold text-xs text-foreground tracking-tight truncate">{task.title}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] h-6 px-2 font-medium text-muted-foreground border-border bg-background shrink-0">
                                    {isExpanded ? 'Hide Details' : 'Review Step'}
                                </Badge>
                            </div>

                            {/* EXPANDABLE WORKSPACE SECTION */}
                            {isExpanded && (
                                <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 text-xs animate-fadeIn">

                                    {/* Iris Dynamic Tip Slot */}
                                    <div className="text-muted-foreground bg-background p-3 border border-border/40 rounded-lg flex gap-2.5 leading-relaxed shadow-sm">
                                        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span>{task.body || 'Review this roadmap objective carefully to maintain strong deal execution.'}</span>
                                    </div>

                                    {/* 🔌 DATA ENRICHMENT INTERACTION MODULE */}
                                    {configId === 'verify_company_details' && (
                                        <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                                                <span className="font-bold text-foreground tracking-tight flex items-center gap-1.5">
                                                    <Search className="h-3.5 w-3.5 text-primary" /> Integrated Enrichment Lookups
                                                </span>
                                                <span className="text-[10px] font-medium text-muted-foreground">Connected Providers: Apollo, Lusha</span>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                Instantly cross-reference records against public data files to fill out website URLs, industry categories, and background descriptions.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted" onClick={() => toast.info('Enriching company domain properties via Apollo proxy call...')}>
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Run Apollo Scan
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted" onClick={() => toast.info('Cross-referencing legal filing indexes via Lusha search rows...')}>
                                                    <Search className="h-3.5 w-3.5 text-blue-500" /> Run Lusha Scan
                                                </Button>
                                                <div className="ml-auto">
                                                    <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(task, { verified_domain: 'success_verified' })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground shadow-sm px-3.5">
                                                        Confirm Research is Clear
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 👥 STAKEHOLDER LINK INLINE INSTRUCTIONS */}
                                    {configId === 'find_key_people' && (
                                        <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                                <span className="font-bold text-foreground tracking-tight flex items-center gap-1.5">
                                                    <UserPlus className="h-3.5 w-3.5 text-primary" /> Multi-Thread Buying Committee
                                                </span>
                                                <Badge
                                                    variant={contacts.length >= 2 ? 'outline' : 'secondary'}
                                                    className={`text-[10px] font-bold transition-colors ${contacts.length >= 2
                                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                            : ''
                                                        }`}
                                                >
                                                    Mapped: {contacts.length} / 2 People
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                Mapping multiple people protects you if one person goes silent or leaves the company. Use our directory page to import titles or link social profile links.
                                            </p>
                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <span className="text-[10px] font-semibold text-muted-foreground">
                                                    {contacts.length >= 2 ? '✅ Minimum relationship depth target achieved!' : '⚠️ Missing backup contact coverage path.'}
                                                </span>
                                                <Button type="button" size="sm" disabled={contacts.length < 2 || isSaving} onClick={() => handleCompleteTask(task, { total_mapped: contacts.length })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-50 shadow-sm px-4">
                                                    Lock Mapped Committee
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 🔒 PRE-FLIGHT REVIEW CHECKBOX TRIGGER */}
                                    {configId === 'pre_outreach_prep' && (
                                        <div className="flex items-center justify-between gap-4 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                                            <span className="text-muted-foreground text-[11px] leading-relaxed max-w-md">
                                                By checking this box, you confirm that you have scanned their current update track and have a clean mental picture of how your specific offerings match their situation.
                                            </span>
                                            <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(task, { user_preflight_confirmed: true })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground gap-1 shadow-sm shrink-0 px-4">
                                                <Check className="h-3.5 w-3.5" /> Ready to Reach Out
                                            </Button>
                                        </div>
                                    )}

                                    {/* 📧 AUTOMATED OUTREACH BLUEPRINT GENERATOR */}
                                    {configId === 'send_first_outreach' && (
                                        <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                                <span className="font-bold text-foreground tracking-tight flex items-center gap-1.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Iris Blueprinting Suite
                                                </span>

                                                <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
                                                    <button type="button" onClick={() => setSelectedChannel('email')} className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${selectedChannel === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground/70 hover:text-foreground'}`}>
                                                        Email
                                                    </button>
                                                    <button type="button" onClick={() => setSelectedChannel('linkedin')} className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-0.5 ${selectedChannel === 'linkedin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground/70 hover:text-foreground'}`}>
                                                        LinkedIn
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Display Cached Draft output directly inline */}
                                            {generatedDraft ? (
                                                <div className="space-y-3 p-3 bg-muted/30 border border-border/40 rounded-lg animate-fadeIn text-[11px] leading-relaxed">
                                                    {selectedChannel === 'email' ? (
                                                        <>
                                                            <div className="border-b border-border/40 pb-1.5"><span className="text-muted-foreground font-semibold uppercase text-[9px] block">Subject Blueprint Line:</span><span className="font-bold text-foreground">{generatedDraft.subject}</span></div>
                                                            <div className="whitespace-pre-wrap text-muted-foreground pt-1">{generatedDraft.body}</div>
                                                        </>
                                                    ) : (
                                                        <div className="whitespace-pre-wrap text-muted-foreground"><span className="text-muted-foreground font-semibold uppercase text-[9px] block mb-1">Connection Request Copy:</span>{generatedDraft.message}</div>
                                                    )}
                                                    <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground italic flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 text-primary" /> Copy this draft into your mailbox or messaging app, hit send, and finalize the step below!
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                    Let Iris compose a personalized outreach message using their news trigger. No sales pitches—just a clear, friendly chat opener tailored to their profile.
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 mt-1">
                                                <Button type="button" variant="outline" size="sm" disabled={isAiLoading} onClick={() => handleTriggerAiAction(task)} className="h-8 text-xs font-semibold gap-1 hover:bg-muted">
                                                    {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedChannel === 'email' ? <Mail className="h-3.5 w-3.5 text-primary" /> : <LinkedInIcon size={14} />}
                                                    {generatedDraft ? 'Regenerate Draft Template' : 'Draft Outreach message with AI'}
                                                </Button>
                                                <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(task, { message_sent: true, selected_channel: selectedChannel })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground shadow-sm px-4">
                                                    Confirm Message Has Been Sent
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 📝 CONVERSATION FIT SCORING & FORM FORM */}
                                    {configId === 'log_discovery_call' && (
                                        <div className="space-y-4 bg-background p-4 border border-border/40 rounded-lg shadow-sm">

                                            {/* Sub-form section 1: Score selector */}
                                            <div className="space-y-2">
                                                <span className="font-bold text-foreground tracking-tight block">1. Conversation Fit Check Score</span>
                                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                    Rate your project alignment from 1 (unrelated/cold) to 9 (perfect alignment). Target a score of 8 or higher before moving past discovery rules.
                                                </p>
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((scoreValue) => (
                                                        <button
                                                            key={scoreValue}
                                                            type="button"
                                                            onClick={() => setFitScore(scoreValue)}
                                                            className={`h-8 w-8 font-bold text-xs rounded-lg border transition-all ${fitScore === scoreValue
                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-105'
                                                                    : 'bg-muted/20 border-border hover:bg-muted text-muted-foreground'
                                                                }`}
                                                        >
                                                            {scoreValue}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Sub-form section 2: Short text impact box */}
                                            <div className="space-y-2 pt-1">
                                                <span className="font-bold text-foreground tracking-tight block">2. Estimated Financial Dollar Impact</span>
                                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                    Note down any specific revenue losses or cost estimates they shared. (e.g., &quot;Losing $12k monthly on tech bugs&quot; or &quot;Missing out on 4 new deals each quarter&quot;).
                                                </p>
                                                <input
                                                    type="text"
                                                    placeholder="Type out a quick summary of the financial impact they described..."
                                                    value={financialImpact}
                                                    onChange={(e) => setFinancialImpact(e.target.value)}
                                                    className="w-full bg-muted/10 border border-border focus:border-primary/50 text-xs px-3 h-9 rounded-lg focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Execution bar */}
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={fitScore === null || !financialImpact.trim() || isSaving}
                                                    onClick={() => handleCompleteTask(task, { score: fitScore, financial_impact: financialImpact.trim() })}
                                                    className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-50 px-4"
                                                >
                                                    Save Metrics & Close Milestone
                                                </Button>
                                            </div>

                                        </div>
                                    )}

                                </div>
                            )}

                        </Card>
                    );
                })
            )}

        </div>
    );
}