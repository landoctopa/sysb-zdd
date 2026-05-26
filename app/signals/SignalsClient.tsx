'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  Loader2,
  Building2,
  TrendingUp,
  Calendar,
  Shield,
  Newspaper,
  XCircle,
  ListFilter,
  ChevronDown,
  ChevronUp,
  Brain,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { promotePotential, dismissSignal } from '@/app/actions/potentialActions';
import { VirtualSignalState, Stage1Dossier } from '@/types/signals';
import { toast } from 'sonner';
import { Database } from '../../database.types';

type RawSignal = Database['public']['Tables']['raw_signals']['Row'];
type SignalType = Database['public']['Enums']['signal_category'];
type ExtendedSignal = RawSignal & { signal_type?: SignalType | null };

const SIGNAL_TYPES: Record<SignalType, any> = {
  'Company News': { label: 'Company News', icon: Newspaper, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', borderColor: 'border-l-blue-500' },
  'Industry Trend': { label: 'Industry Trend', icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', borderColor: 'border-l-emerald-500' },
  'Events/Meetups': { label: 'Events/Meetups', icon: Calendar, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', borderColor: 'border-l-purple-500' },
  'Regulatory/Government': { label: 'Regulatory/Government', icon: Shield, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', borderColor: 'border-l-amber-500' },
  'Request for Proposal': { label: 'RFP', icon: Shield, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', borderColor: 'border-l-rose-500' },
  'Expression of Interest': { label: 'EOI', icon: ListFilter, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', borderColor: 'border-l-orange-500' },
  'Call for Tenders': { label: 'Tenders', icon: Building2, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', borderColor: 'border-l-indigo-500' },
};

export default function SignalsClient({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<'matched' | 'trends' | 'events'>('matched');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectors] = useState<string[]>([]);
  const [selectedEventCategories] = useState<string[]>([]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [virtualStates, setVirtualStates] = useState<Record<string, VirtualSignalState>>({});

  const [offset, setOffset] = useState(0);
  const [allSignals, setAllSignals] = useState<ExtendedSignal[]>([]);
  const limit = 20;

  useEffect(() => {
    const loadedStates: Record<string, VirtualSignalState> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('v_signal_')) {
        const id = key.replace('v_signal_', '');
        try {
          loadedStates[id] = JSON.parse(sessionStorage.getItem(key) || '');
        } catch (_) {}
      }
    }
    setVirtualStates(loadedStates);
  }, []);

  // Strict Enums Mapping to sync perfectly with your Postgres schema arrays
  const tabToSignalTypes: Record<string, string[]> = {
    matched: ['Company News', 'Request for Proposal', 'Expression of Interest', 'Call for Tenders'],
    trends: ['Industry Trend', 'Regulatory/Government'],
    events: ['Events/Meetups'],
  };

  useEffect(() => {
    setOffset(0);
    setAllSignals([]);
  }, [activeTab, searchQuery, selectedSectors, selectedEventCategories]);

  const { data, isLoading } = useQuery({
    queryKey: ['signals', activeTab, searchQuery, selectedSectors, selectedEventCategories, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: 'inbox',
        q: searchQuery,
        signal_types: tabToSignalTypes[activeTab].join(','),
        sectors: selectedSectors.join(','),
        event_categories: selectedEventCategories.join(','),
        offset: String(offset),
        limit: String(limit),
      });
      const res = await fetch(`/api/signals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.signals) {
      if (offset === 0) setAllSignals(data.signals);
      else setAllSignals((prev) => [...prev, ...data.signals]);
    }
  }, [data, offset]);

  const handleToggleRow = async (signalId: string) => {
    if (expandedSignalId === signalId) {
      setExpandedSignalId(null);
      return;
    }

    setExpandedSignalId(signalId);
    if (virtualStates[signalId]) return;

    try {
      setAnalyzingId(signalId);
      const res = await fetch('/api/signals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSignalId: signalId }),
      });

      if (!res.ok) throw new Error('Analysis pass failed');
      const dossier: Stage1Dossier = await res.json();

      const initialVirtualState: VirtualSignalState = {
        ai_dossier: dossier,
        tasks: {
          assess_signal_relevance: { completed: true, answers: { relevance: 'High', notes: 'Auto-verified via intake brief.' } },
          extract_potential_contacts: { completed: false }
        },
      };

      sessionStorage.setItem(`v_signal_${signalId}`, JSON.stringify(initialVirtualState));
      setVirtualStates((prev) => ({ ...prev, [signalId]: initialVirtualState }));
    } catch (err) {
      toast.error('Iris could not compile matching dossier.');
      setExpandedSignalId(null);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Fixed core Promotion logic: Bypasses deleted task inputs to execute flawlessly
  const handlePromoteToLead = (signalId: string) => {
    const state = virtualStates[signalId];
    if (!state) return;

    const toastId = toast.loading('Initializing lead portfolio file...');

    startTransition(async () => {
      try {
        const result = await promotePotential(signalId, state);
        sessionStorage.removeItem('v_signal_' + signalId);
        
        toast.success('Promoted successfully! Opening workspace...', { id: toastId });
        
        // Clear cache across React Query to prevent UI ghost lines
        queryClient.invalidateQueries({ queryKey: ['signals'] });
        
        const cleanPath = '/leads/' + result.leadId;
        router.push(cleanPath);
      } catch (err: any) {
        console.error('[Promotion Transaction Failure]:', err);
        toast.error(err.message || 'Promotion transaction failed.', { id: toastId });
      }
    });
  };

  // Safe Dismissal Logic targeting your clean suppression ledger
  const handleDismissOpportunity = async (signalId: string) => {
    const toastId = toast.loading('Suppressing stream matching entries...');
    try {
      await dismissSignal(signalId);
      sessionStorage.removeItem('v_signal_' + signalId);
      toast.success('Opportunity hidden from feed workspace.', { id: toastId });
      
      setAllSignals((prev) => prev.filter((s) => s.id !== signalId));
      setExpandedSignalId(null);
      queryClient.invalidateQueries({ queryKey: ['signals'] });
    } catch (err: any) {
      toast.error('Could not discard signal sequence.', { id: toastId });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
          <p className="text-muted-foreground mt-1">Curated opportunities matched via Iris micro-orchestration skills.</p>
        </div>
      </div>

      {/* Tabs and search controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full lg:w-auto">
          <TabsList className="bg-muted/50 p-1 w-full lg:w-auto">
            <TabsTrigger value="matched" className="gap-2"><Newspaper className="h-4 w-4" />Matched Feeds</TabsTrigger>
            <TabsTrigger value="trends" className="gap-2"><TrendingUp className="h-4 w-4" />Trends</TabsTrigger>
            <TabsTrigger value="events" className="gap-2"><Calendar className="h-4 w-4" />Events</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search company or trigger..."
              className="pl-9 h-10 bg-muted/50 border-muted focus:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Primary interactive signal feed workspace */}
      <div className="space-y-4">
        {isLoading && allSignals.length === 0 ? (
          <div className="text-center py-10"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>
        ) : allSignals.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/60" />
            No un-triaged target signals discovered.
          </div>
        ) : (
          allSignals.map((signal) => {
            const config = SIGNAL_TYPES[signal.signal_type || 'Company News'] || SIGNAL_TYPES['Company News'];
            const SignalTypeIcon = config.icon;
            const isExpanded = expandedSignalId === signal.id;
            const vState = virtualStates[signal.id];
            const isAnalyzing = analyzingId === signal.id;

            return (
              <div
                key={signal.id}
                className={`bg-card rounded-xl border-l-4 ${config.borderColor} border border-border/60 transition-all duration-200 overflow-hidden`}
              >
                {/* Clickable Card Header */}
                <div
                  onClick={() => !isAnalyzing && handleToggleRow(signal.id)}
                  className="p-5 cursor-pointer hover:bg-muted/30 flex items-start justify-between gap-4 select-none"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[11px] font-semibold px-2 py-0.5 gap-1 border ${config.color}`}>
                        <SignalTypeIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <h3 className="font-bold text-base text-foreground leading-tight">{signal.title}</h3>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {signal.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{signal.company_name}</span>}
                      {signal.published_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(signal.published_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAnalyzing ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Explicit Generation State Loader */}
                {isExpanded && isAnalyzing && (
                  <div className="border-t border-border/40 p-6 bg-muted/10 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground animate-pulse">
                    <Brain className="h-6 w-6 animate-bounce text-primary/70" />
                    <p className="font-medium">Iris is compiling your strategic matching dossier using DeepSeek...</p>
                  </div>
                )}

                {/* Streamlined Strategic Briefing Workspace */}
                {isExpanded && vState && !isAnalyzing && (
                  <div className="border-t border-border/60 bg-muted/20 p-6 flex flex-col gap-6 animate-fadeIn">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Detailed Analysis Column */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="bg-card rounded-lg p-5 border border-border/40 space-y-4">
                          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <Brain className="h-4 w-4" />
                            Iris Strategic Briefing
                          </div>
                          
                          <div className="space-y-4 text-sm leading-relaxed">
                            <div>
                              <span className="font-bold text-xs text-muted-foreground/80 uppercase tracking-wider block">Strategic Analysis</span>
                              <p className="text-foreground/90 mt-1">{vState.ai_dossier.strategic_analysis}</p>
                            </div>
                            <div>
                              <span className="font-bold text-xs text-muted-foreground/80 uppercase tracking-wider block">Trigger Alignment Justification</span>
                              <p className="text-foreground/90 mt-1">{vState.ai_dossier.trigger_alignment}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-primary/5 rounded-lg p-5 border border-primary/10 space-y-2">
                          <span className="font-bold text-xs text-primary uppercase tracking-wider block">Target Persona Alignment Guide</span>
                          <p className="text-sm text-foreground/90 leading-relaxed">{vState.ai_dossier.contact_qualification_guide}</p>
                        </div>
                      </div>

                      {/* Right-Side KPI & Action Panel */}
                      <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                        <div className="bg-card rounded-lg p-5 border border-border/40 space-y-4 flex-1">
                          <span className="text-sm font-semibold text-muted-foreground block">Match Parameters</span>
                          
                          <div className="space-y-4">
                            <div>
                              <span className="font-semibold text-xs text-muted-foreground uppercase block">Iris Fitness Score</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-extrabold text-foreground tracking-tight">{vState.ai_dossier.hotness_score}</span>
                                <span className="text-xs text-muted-foreground">/ 100</span>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-muted-foreground uppercase block">Estimated Sales Cycle</span>
                              <span className="text-foreground text-sm font-bold block mt-1">{vState.ai_dossier.estimated_sales_cycle}</span>
                            </div>
                          </div>
                        </div>

                        {/* Split Action Decision Layout */}
                        <div className="grid grid-cols-2 gap-3 mt-auto">
                          <Button
                            variant="outline"
                            onClick={() => handleDismissOpportunity(signal.id)}
                            disabled={isPending}
                            className="font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-muted"
                          >
                            <XCircle className="h-4 w-4 mr-2 text-destructive/80" />
                            Dismiss
                          </Button>
                          <Button
                            onClick={() => handlePromoteToLead(signal.id)}
                            disabled={isPending}
                            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                          >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Promote
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}