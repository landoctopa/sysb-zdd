'use client';
// app/leads/PipelineView.tsx

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $leadsList } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Handshake,
  Target,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
  UserX,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

// EXACT SCHEMA ENUM CONFIGURATION: Pure 8-stage map matching our clean database state
const STAGE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  all: { label: 'All Opportunities', icon: Briefcase, color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
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
  
  // 🛠️ FIX: Defaulting stage state to 'all' to show everything out of the gate
  const [selectedStage, setSelectedStage] = useState<string>('all');

  // Pure list containing our filter controls matching exactly our database states
  const stages = ['all', 'discovery', 'engaged', 'solution_fit', 'proposal', 'negotiation', 'close', 'won', 'lost'];

  const getFilteredLeads = () => {
    if (selectedStage === 'all') return leads;
    return leads.filter((lead) => lead.status === selectedStage);
  };

  const getStageCount = (stage: string) => {
    if (stage === 'all') return leads.length;
    return leads.filter((lead) => lead.status === stage).length;
  };

  const totalLeads = leads.length;
  const wonLeads = leads.filter((lead) => lead.status === 'won').length;
  const lostLeads = leads.filter((lead) => lead.status === 'lost').length;
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

  const displayedLeads = getFilteredLeads();

  return (
    <div className="space-y-6">
      {/* Clean, Decoupled Top Header Banner Section */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Opportunity Pipeline</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Track deal progress and manage your sales workflow</p>
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

      <div className="space-y-4 pt-2">
        {/* 🛠️ PLACEMENT REFINE: Positioned filter dropdown context row directly above the table list */}
        <div className="flex items-center justify-between gap-4 bg-slate-900 p-2 border border-slate-200/60 rounded-xl">
          <div className="flex items-center gap-2 px-1 text-slate-300 text-[11px] font-bold uppercase tracking-wider select-none">
            <span>Showing Stage:</span>
            <span className="text-slate-900 font-extrabold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
              {(STAGE_CONFIG[selectedStage] || { label: selectedStage }).label}
            </span>
          </div>

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-bold px-3 h-8.5 rounded-lg shadow-sm focus:outline-none focus:border-slate-400 text-slate-700 cursor-pointer transition-colors"
          >
            {stages.map((stage) => {
              const config = STAGE_CONFIG[stage];
              const count = getStageCount(stage);
              return (
                <option key={stage} value={stage}>
                  {config ? config.label : stage} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Table Canvas Block */}
        <div className="space-y-3">
          {displayedLeads.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-100 rounded-xl shadow-sm animate-fadeIn">
              <h3 className="text-xs font-bold text-slate-400">No opportunities found inside this filtered track</h3>
            </div>
          ) : (
            displayedLeads.map((lead) => (
              <Link href={`/leads/${lead.id}`} key={lead.id} className="block group">
                <Card className="border-slate-200 hover:border-slate-900 transition-all duration-150 cursor-pointer bg-white shadow-sm hover:shadow">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-xs text-slate-900 truncate group-hover:text-slate-950">
                          {lead.company_name || 'Untitled Lead'}
                        </h3>
                        {/* Status badge appended inline when viewing 'All' context cards */}
                        {selectedStage === 'all' && (
                          <span className={`capitalize px-1.5 py-0.5 font-bold rounded text-[8px] tracking-tight border ${
                            lead.status === 'won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            lead.status === 'lost' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {(STAGE_CONFIG[lead.status] || { label: lead.status }).label}
                          </span>
                        )}
                      </div>
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
    </div>
  );
}