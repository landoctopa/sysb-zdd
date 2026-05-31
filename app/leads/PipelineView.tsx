'use client';
// app/leads/PipelineView.tsx

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $leadsList } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Clock,
  FileText,
  Handshake,
  Target,
  CheckCircle2,
  ArrowRight,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  UserX,
  Archive,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

// EXACT SCHEMA ENUM CONFIGURATION: Pure 8-stage map matching our clean database state
const STAGE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  discovery: { label: 'Discovery', icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  engaged: { label: 'Engaged', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  solution_fit: { label: 'Solution Fit', icon: Target, color: 'text-violet-500', bgColor: 'bg-violet-500/10 border-violet-500/20' },
  proposal: { label: 'Proposal', icon: FileText, color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  negotiation: { label: 'Negotiation', icon: Handshake, color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  close: { label: 'Closing Phase', icon: ArrowUpRight, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10 border-indigo-500/20' },
  won: { label: 'Won Deals', icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  lost: { label: 'Lost Deals', icon: UserX, color: 'text-rose-500', bgColor: 'bg-rose-500/10 border-rose-500/20' }
};

const getHotnessColor = (score: number | null) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600 font-bold';
  if (score >= 60) return 'text-blue-600 font-bold';
  if (score >= 40) return 'text-amber-600 font-bold';
  return 'text-rose-600 font-bold';
};

export default function PipelineView() {
  const leads = useStore($leadsList);
  
  // Clean initialization directly inside the discovery tracks
  const [selectedStage, setSelectedStage] = useState<string>('discovery');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  // Pure list containing exactly our 8 real database states
  const stages = ['discovery', 'engaged', 'solution_fit', 'proposal', 'negotiation', 'close', 'won', 'lost'];

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.status === stage);
  };

  const getStageCount = (stage: string) => {
    return leads.filter((lead) => lead.status === stage).length;
  };

  const totalLeads = leads.length;
  const wonLeads = getLeadsByStage('won').length;
  const lostLeads = getLeadsByStage('lost').length;
  const activeLeadsCount = totalLeads - wonLeads - lostLeads;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / (totalLeads - lostLeads || 1)) * 100) : 0;

  if (leads.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
            <p className="text-muted-foreground mt-1">Track and manage your sales opportunities</p>
          </div>
        </div>

        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
            <Target className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold mb-1 text-slate-900">No leads active yet</h3>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto leading-relaxed">
            Promote opportunities from your market intelligence signal stream to open an active deal file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions Grid Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Opportunity Pipeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track deal progress and manage your sales workflow</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-white shadow-sm">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              className="h-7.5 px-3 text-xs font-bold"
              onClick={() => setViewMode('pipeline')}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-7.5 px-3 text-xs font-bold"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5 mr-1" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Metric Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Opportunities', val: totalLeads, color: 'text-slate-950' },
          { label: 'Active Pipeline', val: activeLeadsCount, color: 'text-blue-600' },
          { label: 'Won Deals', val: wonLeads, color: 'text-emerald-600' },
          { label: 'Conversion Rate', val: `${conversionRate}%`, color: 'text-indigo-600' }
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-200/80 shadow-sm bg-white">
            <CardContent className="p-4 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
              <p className={`text-xl font-black tracking-tight ${kpi.color}`}>{kpi.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === 'pipeline' ? (
        <div className="space-y-4">
          {/* Status Selector Track */}
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              {/* Active Tracking Track */}
              <div className="flex gap-1.5 flex-wrap">
                {stages.slice(0, 6).map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const Icon = config.icon;
                  const count = getStageCount(stage);
                  const isActive = selectedStage === stage;

                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all text-xs font-bold capitalize cursor-pointer ${
                        isActive
                          ? `${config.bgColor} border-slate-900 text-slate-900 shadow-sm ring-2 ring-slate-900/5`
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{config.label}</span>
                      <Badge variant={isActive ? 'default' : 'secondary'} className="ml-0.5 h-4.5 min-w-[18px] px-1 text-[9px] font-black">{count}</Badge>
                    </button>
                  );
                })}
              </div>

              {/* Terminal Archives Split Block Track */}
              <div className="flex gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                {stages.slice(6).map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const count = getStageCount(stage);
                  const isActive = selectedStage === stage;

                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded border text-[11px] font-bold capitalize cursor-pointer transition-all ${
                        isActive
                          ? `${config.bgColor} border-slate-950 text-slate-950 shadow-sm font-black`
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Archive className="h-3 w-3 text-slate-400" />
                      <span>{config.label}</span>
                      <span className={`text-[10px] ml-0.5 font-black ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List Display Canvas Block */}
          <div className="space-y-3">
            {getLeadsByStage(selectedStage).length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-100 rounded-xl shadow-sm animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-400">No deal portfolios inside this status track</h3>
              </div>
            ) : (
              getLeadsByStage(selectedStage).map((lead) => (
                <Link href={`/leads/${lead.id}`} key={lead.id} className="block group">
                  <Card className="border-slate-200 hover:border-slate-900 transition-all duration-150 cursor-pointer bg-white shadow-sm hover:shadow">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-bold text-xs text-slate-900 truncate group-hover:text-slate-950">
                          {lead.company_name || 'Untitled Lead'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className={getHotnessColor(lead.hotness_score)}>
                            {lead.hotness_score || 0}% Fit
                          </span>
                          {lead.deal_timeline && <span>• {lead.deal_timeline}</span>}
                          <span>• Added {new Date(lead.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Unified List View */
        <div className="space-y-3">
          {leads.map((lead) => (
            <Link href={`/leads/${lead.id}`} key={lead.id} className="block group">
              <Card className="border-slate-200 hover:border-slate-900 transition-all duration-150 bg-white shadow-sm hover:shadow">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-xs text-slate-900">{lead.company_name || 'Untitled Lead'}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className={getHotnessColor(lead.hotness_score)}>{lead.hotness_score || 0}% Fit</span>
                      <span className={`capitalize px-2 py-0.5 font-bold rounded text-[9px] border ${
                        lead.status === 'won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        lead.status === 'lost' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {(STAGE_CONFIG[lead.status] || { label: lead.status }).label}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}