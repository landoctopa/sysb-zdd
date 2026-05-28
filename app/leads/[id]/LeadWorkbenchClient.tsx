'use client';

import React, { useState, useTransition } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
    Brain,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    History as HistoryIcon,
    Layers,
    ListCheck,
    Loader2,
    Mail,
    Network,
    Search,
    Sparkles,
    Target,
    UserPlus,
    Users,
    AlertTriangle
} from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { toast } from 'sonner';
import { Database } from '@/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type LeadStage = Database['public']['Enums']['lead_status'];

interface WorkbenchProps {
    initialLead: Lead;
    initialActions: Action[];
}

// 1. THE STAGE TAXONOMY REGISTRY
const STAGES: { value: LeadStage; label: string }[] = [
    { value: 'signal', label: '1. Signal' },
    { value: 'discovery', label: '2. Discovery' },
    { value: 'engaged', label: '3. Engaged' },
    { value: 'solution_fit', label: '4. Value Fit' },
    { value: 'proposal', label: '5. Proposal' },
    { value: 'negotiation', label: '6. Negotiate' },
    { value: 'close', label: '7. Close' },
    { value: 'post_close', label: '8. Handoff' }
];

export default function LeadWorkbenchClient({ initialLead, initialActions }: WorkbenchProps) {
    const [lead, setLead] = useState<Lead>(initialLead);
    const [actions, setActions] = useState<Action[]>(initialActions);
    const [contacts, setContacts] = useState<Contact[]>([]); // Populated via a separate query or action real-time
    const [activeTab, setActiveTab] = useState<'tasks' | 'research' | 'history'>('tasks');
    const [isIrisMode, setIsIrisMode] = useState<boolean>(true);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Input states for fast inline contact creation
    const [newContactName, setNewContactName] = useState('');
    const [newContactRole, setNewContactRole] = useState('');
    const [newContactLinkedin, setNewContactLinkedin] = useState('');

    // BANT scoring local indicators
    const [bantBudget, setBantBudget] = useState<number>(0);
    const [bantTimeline, setBantTimeline] = useState<number>(0);
    const [bantNeed, setBantNeed] = useState<number>(0);
    const [financialImpact, setFinancialImpact] = useState<string>('');

    // 2. TRANSACTIONAL STATE MUTATORS (Manual Checkpoint Gates)
    const handleCompleteCheckpoint = (actionId: string, customMetadata = {}) => {
        const toastId = toast.loading('Committing checkpoint confirmation state...');

        startTransition(async () => {
            try {
                // Mocking database hit - replacement hook for inline Server Action mutation updates
                setActions((prev) =>
                    prev.map((act) => {
                        if (act.id !== actionId) return act;

                        // 1. Verify metadata is an object and not an array or primitive primitive before spreading
                        const safeMetadata = act.metadata && typeof act.metadata === 'object' && !Array.isArray(act.metadata)
                            ? (act.metadata as Record<string, any>)
                            : {};

                        // 2. Return the cleanly updated object architecture
                        return {
                            ...act,
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            metadata: {
                                ...safeMetadata,
                                ...customMetadata
                            }
                        };
                    })
                );
                toast.success('Milestone saved permanently.', { id: toastId });
                setExpandedCardId(null);
            } catch (err) {
                toast.error('Database transaction rejected.', { id: toastId });
            }
        });
    };

    const handleCreateContactInline = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContactName || !newContactRole) return;

        const mockNewContact: Contact = {
            id: crypto.randomUUID(),
            lead_id: lead.id,
            name: newContactName,
            role: newContactRole,
            linkedin_url: newContactLinkedin || null,
            is_decision_maker: newContactRole.toLowerCase().includes('vp') || newContactRole.toLowerCase().includes('director') || newContactRole.toLowerCase().includes('head'),
            email: null,
            phone: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        setContacts((prev) => [...prev, mockNewContact]);
        setNewContactName('');
        setNewContactRole('');
        setNewContactLinkedin('');
        toast.success('Contact added and contextual widget arrays updated.');
    };

    // Calculate runtime account fitness parameters
    const aggregateScore = bantBudget + bantTimeline + bantNeed + (contacts.length >= 2 ? 3 : 0);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">

            {/* ZONE 1: THE PIPELINE STATUS BAR HEADER */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{lead.company_name || 'Unknown Corporate Entity'}</h1>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-semibold uppercase tracking-wider text-[10px]">
                                Active Stage: {lead.status}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Lead Identification ID: <span className="font-mono text-foreground">{lead.id}</span></p>
                    </div>

                    <div className="flex items-center gap-6 bg-muted/30 p-3 rounded-lg border border-border/40">
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">Iris Fit Rating</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-2xl font-black text-foreground tracking-tight">{aggregateScore}</span>
                                <span className="text-xs text-muted-foreground">/ 12</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-border/80" />
                        <Button
                            disabled={aggregateScore < 8 || contacts.length < 2 || !financialImpact}
                            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow px-4"
                        >
                            Advance Stage ➔
                        </Button>
                    </div>
                </div>

                {/* The 8-Stage Progress Tracker Map */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
                    {STAGES.map((stg) => {
                        const isCurrent = lead.status === stg.value;
                        return (
                            <div
                                key={stg.value}
                                className={`rounded-lg p-2.5 border text-center transition-all ${isCurrent
                                        ? 'bg-primary/10 border-primary/40 shadow-sm shadow-primary/5 text-primary font-bold'
                                        : 'bg-muted/20 border-border/40 text-muted-foreground text-xs font-medium'
                                    }`}
                            >
                                <span className="block truncate tracking-tight text-xs">{stg.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CORE FRAMEWORK GRID DISPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* CENTER INTERACTIVE WORKSPACE SECTION (TABS MATRIX) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                            <TabsList className="bg-muted/60 p-1">
                                <TabsTrigger value="tasks" className="gap-1.5 text-xs"><ListCheck className="h-3.5 w-3.5" />Tasks</TabsTrigger>
                                <TabsTrigger value="research" className="gap-1.5 text-xs"><Brain className="h-3.5 w-3.5" />Research</TabsTrigger>
                                <TabsTrigger value="history" className="gap-1.5 text-xs"><HistoryIcon className="h-3.5 w-3.5" />History</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Manual / Iris Interface Core Switch Toggle */}
                        <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/40">
                            <Button
                                variant={isIrisMode ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs font-semibold px-3 gap-1"
                                onClick={() => setIsIrisMode(true)}
                            >
                                <Sparkles className="h-3 w-3" /> Iris Mode
                            </Button>
                            <Button
                                variant={!isIrisMode ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs font-semibold px-3 gap-1"
                                onClick={() => setIsIrisMode(false)}
                            >
                                Manual Mode
                            </Button>
                        </div>
                    </div>

                    {/* TAB CONTENT HOOK A: ACTIVE OPEN PLAYBOOK TASKS */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-3">
                            {actions.filter(a => a.status === 'pending').length === 0 ? (
                                <div className="bg-card rounded-xl border border-border/40 p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    All active stage task checklists have been verified and confirmed.
                                </div>
                            ) : (
                                actions.filter(a => a.status === 'pending').map((act) => {
                                    const isExpanded = expandedCardId === act.id;
                                    return (
                                        <div key={act.id} className="bg-card rounded-xl border border-border/60 overflow-hidden transition-all shadow-sm">
                                            <div
                                                onClick={() => setExpandedCardId(isExpanded ? null : act.id)}
                                                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 select-none"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-primary"><ListCheck className="h-4 w-4" /></div>
                                                    <div>
                                                        <h3 className="font-bold text-sm text-foreground">{act.title}</h3>
                                                        <span className="text-[11px] text-muted-foreground block mt-0.5">Required Track: {act.stage} Pipeline Element</span>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                            </div>

                                            {/* TASK CARD ACTION BODY: CONTEXTUAL MORPHING ENGINE PLUGINS */}
                                            {isExpanded && (
                                                <div className="p-5 border-t border-border/40 bg-muted/10 space-y-4 animate-fadeIn">
                                                    {act.iris_tip && (
                                                        <div className="bg-primary/5 border border-primary/10 text-xs text-foreground/90 p-3.5 rounded-lg flex items-start gap-2.5">
                                                            <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                            <div><span className="font-bold text-primary">Iris Playbook Skill Tip:</span> {act.iris_tip}</div>
                                                        </div>
                                                    )}

                                                    {/* PROVISIONED CONTEXTUAL WIDGET A: FIRMOGRAPHIC VERIFICATION TRACK */}
                                                    {act.title.toLowerCase().includes('justification') && (
                                                        <div className="space-y-4 bg-card rounded-lg p-4 border border-border/40">
                                                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                                                <span className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />Firmographic Parameters</span>
                                                                <Badge variant="outline" className="text-[10px] text-muted-foreground hover:bg-primary/5 cursor-pointer">
                                                                    ⚡ Integrate Apollo / Lusha
                                                                </Badge>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                <div>
                                                                    <label className="text-muted-foreground font-medium block mb-1">Company Target Domain</label>
                                                                    <Input placeholder="e.g. stripe.com" defaultValue="thirdwavecoffee.com" className="h-8 text-xs bg-background" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-muted-foreground font-medium block mb-1">Estimated Employee Headcount</label>
                                                                    <Input placeholder="e.g. 500" defaultValue="250" className="h-8 text-xs bg-background" />
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleCompleteCheckpoint(act.id, { verified_domain: 'thirdwavecoffee.com', size: '250' })}
                                                                className="w-full text-xs font-bold h-8 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            >
                                                                ✓ Confirm Company Details
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* PROVISIONED CONTEXTUAL WIDGET B: MULTI-THREADED STAKEHOLDER MAPPING TRACK */}
                                                    {act.title.toLowerCase().includes('hurdle') && (
                                                        <div className="space-y-4 bg-card rounded-lg p-4 border border-border/40">
                                                            <span className="text-xs font-bold text-foreground tracking-wider uppercase block border-b border-border/40 pb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" />Stakeholder Configuration Map</span>

                                                            {/* Integrated LinkedIn Sales Navigator Extension Slot Placeholder */}
                                                            <div className="bg-blue-500/5 text-blue-400 border border-blue-500/20 rounded-lg p-3 flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-2 font-medium"><LinkedInIcon size={16} /> LinkedIn Sales Navigator Integration Key Active</span>
                                                                <span className="text-[10px] underline cursor-pointer hover:text-blue-300">Sync Persona Tracks</span>
                                                            </div>

                                                            <form onSubmit={handleCreateContactInline} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                                                <div>
                                                                    <label className="text-[11px] text-muted-foreground font-medium block mb-1">Full Name</label>
                                                                    <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Sarah Jenkins" className="h-8 text-xs bg-background" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[11px] text-muted-foreground font-medium block mb-1">Role Designation</label>
                                                                    <Input value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} placeholder="VP of Procurement" className="h-8 text-xs bg-background" />
                                                                </div>
                                                                <Button type="submit" className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 gap-1"><UserPlus className="h-3.5 w-3.5" /> Link Stakeholder</Button>
                                                            </form>

                                                            {/* Render Mapped List Inline Contextually */}
                                                            {contacts.length > 0 && (
                                                                <div className="border border-border/40 rounded-lg divide-y divide-border/40 bg-background/50 overflow-hidden mt-2 text-xs">
                                                                    {contacts.map((c) => (
                                                                        <div key={c.id} className="p-2.5 flex items-center justify-between gap-2">
                                                                            <div>
                                                                                <span className="font-bold text-foreground">{c.name}</span>
                                                                                <span className="text-muted-foreground mx-1.5">|</span>
                                                                                <span className="text-muted-foreground">{c.role}</span>
                                                                            </div>
                                                                            {c.is_decision_maker && <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold">Decision Maker</Badge>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <Button
                                                                disabled={contacts.length < 2}
                                                                onClick={() => handleCompleteCheckpoint(act.id, { total_mapped: contacts.length })}
                                                                className="w-full text-xs font-bold h-8 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                                            >
                                                                {contacts.length < 2 ? `Add Minimum of 2 Contacts (Current: ${contacts.length})` : '✓ Finished Adding Contacts'}
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* PROVISIONED CONTEXTUAL WIDGET C: DYNAMIC BANT AND SPIN LIVE QUESTIONNAIRE */}
                                                    {!act.title.toLowerCase().includes('justification') && !act.title.toLowerCase().includes('hurdle') && (
                                                        <div className="space-y-4 bg-card rounded-lg p-4 border border-border/40 text-xs">
                                                            <span className="text-xs font-bold text-foreground tracking-wider uppercase block border-b border-border/40 pb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" />Live Conversation Verification Engine</span>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground block mb-1">1. Budget Verification Status</span>
                                                                    <div className="flex gap-1.5">
                                                                        {[{ l: 'Unallocated (0)', v: 0 }, { l: 'Likely (2)', v: 2 }, { l: 'Confirmed (3)', v: 3 }].map((b) => (
                                                                            <Button key={b.l} size="sm" variant={bantBudget === b.v ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]" onClick={() => setBantBudget(b.v)}>{b.l}</Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground block mb-1">2. Urgency Timeline Status</span>
                                                                    <div className="flex gap-1.5">
                                                                        {[{ l: 'Exploring (1)', v: 1 }, { l: '< 90 Days (2)', v: 2 }, { l: '< 30 Days (3)', v: 3 }].map((t) => (
                                                                            <Button key={t.l} size="sm" variant={bantTimeline === t.v ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]" onClick={() => setBantTimeline(t.v)}>{t.l}</Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground block mb-1">3. Core Need Level</span>
                                                                    <div className="flex gap-1.5">
                                                                        {[{ l: 'Nice-to-Have (1)', v: 1 }, { l: 'Important (2)', v: 2 }, { l: 'Critical Pain (3)', v: 3 }].map((n) => (
                                                                            <Button key={n.l} size="sm" variant={bantNeed === n.v ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]" onClick={() => setBantNeed(n.v)}>{n.l}</Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground block mb-1">4. Documented Financial Dollar Impact Notes</span>
                                                                    <Textarea
                                                                        placeholder="e.g. Broken custom server queries cost their cloud operations unit $1,200 monthly in latency drops."
                                                                        value={financialImpact}
                                                                        onChange={(e) => setFinancialImpact(e.target.value)}
                                                                        className="bg-background text-xs min-h-[60px]"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <Button
                                                                onClick={() => handleCompleteCheckpoint(act.id, { score: bantBudget + bantTimeline + bantNeed, financialImpact })}
                                                                className="w-full text-xs font-bold h-8 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            >
                                                                ✓ Submit Discovery & Qualification Metrics
                                                            </Button>
                                                        </div>
                                                    )}

                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB CONTENT HOOK B: RESEARCH MODULE FILTERS */}
                    {activeTab === 'research' && (
                        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-6 shadow-sm">
                            <div>
                                <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider mb-2"><Layers className="h-3.5 w-3.5" />Passive Company Listening Radar</span>
                                <div className="border border-border/40 rounded-lg p-4 bg-muted/10 text-xs flex gap-3 items-start">
                                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-foreground">Continuous Web Monitoring Active:</span> Tracking `thirdwavecoffee.com`. External intelligence drops regarding management shifts or series funding records will feed here cleanly.
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Historical Stage-Gate Intelligence Logs</span>
                                <div className="border border-border/40 rounded-lg divide-y divide-border/40 text-xs bg-background overflow-hidden">
                                    <details className="group">
                                        <summary className="p-3.5 font-bold text-foreground cursor-pointer hover:bg-muted/30 flex items-center justify-between select-none">
                                            <span>Stage 1: Signal Raw Intake Briefing</span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                                        </summary>
                                        <div className="p-4 bg-muted/10 border-t border-border/40 space-y-2 text-foreground/90 leading-relaxed">
                                            <p><strong className="text-xs text-muted-foreground block uppercase">Strategic Analysis</strong> {lead.strategic_analysis || 'No file context recorded.'}</p>
                                            <p><strong className="text-xs text-muted-foreground block uppercase mt-2">Trigger Alignment</strong> {lead.trigger_alignment || 'No background file found.'}</p>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT HOOK C: UNIFIED CHRONOLOGICAL HISTORY LEDGER */}
                    {activeTab === 'history' && (
                        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-4 shadow-sm">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Unified Temporal Account Ledger</span>
                            <div className="space-y-3 relative border-l border-border/80 pl-4 ml-2 text-xs">
                                {actions.filter(a => a.status === 'completed').length === 0 ? (
                                    <span className="text-muted-foreground block py-2">No historical events logged to date.</span>
                                ) : (
                                    actions.filter(a => a.status === 'completed').map((hist) => (
                                        <div key={hist.id} className="relative space-y-1">
                                            <div className="absolute -left-[21px] top-1 bg-emerald-500 rounded-full h-2 w-2 ring-4 ring-background" />
                                            <div className="flex items-center justify-between gap-4 font-bold text-foreground">
                                                <span>{hist.title}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{hist.completed_at ? new Date(hist.completed_at).toLocaleDateString() : ''}</span>
                                            </div>
                                            <p className="text-muted-foreground font-medium leading-relaxed">{hist.body || 'Milestone verified cleanly via checklist confirmation.'}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* ZONE 3: RESPONSIVE CONTACTS SIDEBAR/DRAWER OVERLAY PANELS */}
                <div className="lg:col-span-4 space-y-4">

                    {/* DESKTOP PERMANENT SIDEBAR CONTAINER PANEL */}
                    <div className="hidden lg:block bg-card rounded-xl border border-border/60 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <span className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />Target Account Team</span>
                            <Badge variant="secondary" className="font-mono text-[10px]">{contacts.length} Connected</Badge>
                        </div>

                        {contacts.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                                No human stakeholders mapped yet.<br />Expand active playbook cards to add targets.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {contacts.map((c) => (
                                    <div key={c.id} className="p-3 bg-muted/30 border border-border/40 rounded-lg space-y-1 text-xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-foreground">{c.name}</span>
                                            {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300"><LinkedInIcon size={14} /></a>}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-muted-foreground font-medium">
                                            <span>{c.role}</span>
                                            {c.is_decision_maker && <span className="text-[10px] text-amber-500 font-bold">Decision Maker</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MOBILE DEVICE FLOATING STICKY SHEET OVERLAY PANEL */}
                    <div className="block lg:hidden fixed bottom-4 right-4 z-50">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button className="rounded-full h-12 w-12 bg-primary text-primary-foreground shadow-xl flex items-center justify-center border border-primary/20">
                                    <Users className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-card text-foreground border-l border-border/60 w-[320px]">
                                <SheetHeader className="text-left border-b border-border/40 pb-3">
                                    <SheetTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Network className="h-4 w-4 text-primary" />Mobile Contacts Panel</SheetTitle>
                                </SheetHeader>
                                <div className="space-y-3 pt-4 text-xs">
                                    {contacts.length === 0 ? (
                                        <span className="text-muted-foreground block text-center py-4">No stakeholders mapped.</span>
                                    ) : (
                                        contacts.map((c) => (
                                            <div key={c.id} className="p-3 bg-muted/40 border border-border/40 rounded-lg space-y-1">
                                                <div className="font-bold text-foreground flex justify-between">{c.name}</div>
                                                <div className="text-muted-foreground font-medium">{c.role}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                </div>

            </div>
        </div>
    );
}