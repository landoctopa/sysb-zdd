'use client';

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $leadsList } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Clock,
  Building2,
  Users,
  FileText,
  Handshake,
  Target,
  CheckCircle2,
  Plus,
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  List,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Database } from '../../database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

const STAGE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  new: {
    label: 'New',
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  contacted: {
    label: 'Contacted',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  proposal: {
    label: 'Proposal',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  negotiation: {
    label: 'Negotiation',
    icon: Handshake,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  won: {
    label: 'Won',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

const getLeadCategoryStyle = (category: string | null) => {
  const styles: Record<string, string> = {
    'Strategic Lead':
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Target Account':
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Existing Customer':
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Partner: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return category
    ? styles[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    : 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const getHotnessColor = (score: number | null) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

export default function PipelineView() {
  const leads = useStore($leadsList);
  const [selectedStage, setSelectedStage] = useState<string>('new');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  const stages = ['new', 'contacted', 'proposal', 'negotiation', 'won'];

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.status === stage);
  };

  const getStageCount = (stage: string) => {
    return leads.filter((lead) => lead.status === stage).length;
  };

  const totalLeads = leads.length;
  const wonLeads = getLeadsByStage('won').length;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  if (leads.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your sales opportunities
            </p>
          </div>
          <Button className="shadow-sm gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>

        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Import opportunities from signals or create a new lead manually.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="outline" asChild>
              <Link href="/signals">Browse Signals</Link>
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Lead
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track deal progress and manage your sales workflow
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 gap-1"
              onClick={() => setViewMode('pipeline')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 gap-1"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>

          <Button className="shadow-sm gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total Leads
            </p>
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Active Opportunities
            </p>
            <p className="text-2xl font-bold text-foreground">
              {totalLeads - wonLeads}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Won Deals
            </p>
            <p className="text-2xl font-bold text-emerald-400">{wonLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Conversion Rate
            </p>
            <p className="text-2xl font-bold text-foreground">
              {conversionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' ? (
        <>
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {stages.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const Icon = config.icon;
                const count = getStageCount(stage);
                const isActive = selectedStage === stage;

                return (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                      isActive
                        ? `${config.bgColor} border-primary/50 shadow-sm`
                        : 'bg-background border-border/60 hover:border-primary/30'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? config.color : 'text-muted-foreground'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium capitalize ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {config.label}
                    </span>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="ml-1 h-5 min-w-[20px] px-1 text-[10px]"
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {getLeadsByStage(selectedStage).length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  No leads in {STAGE_CONFIG[selectedStage]?.label.toLowerCase()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedStage === 'new'
                    ? 'Add leads from signals or create a new opportunity to get started.'
                    : `Move leads to ${STAGE_CONFIG[selectedStage]?.label.toLowerCase()} as you progress through the sales cycle.`}
                </p>
              </div>
            ) : (
              getLeadsByStage(selectedStage).map((lead) => (
                <Link
                  href={`/leads/${lead.id}`}
                  key={lead.id}
                  className="block group"
                >
                  <Card className="border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {lead.lead_category && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2 py-0.5 ${getLeadCategoryStyle(
                                  lead.lead_category
                                )}`}
                              >
                                {lead.lead_category}
                              </Badge>
                            )}
                            <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2 flex-1">
                              {lead.company_name || 'Untitled Lead'}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span
                              className={`flex items-center gap-1.5 font-medium ${getHotnessColor(
                                lead.hotness_score
                              )}`}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              {lead.hotness_score || 0}% Fit
                            </span>
                            {lead.deal_timeline && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {lead.deal_timeline}
                              </span>
                            )}
                            {lead.created_at && (
                              <span className="flex items-center gap-1.5 text-[11px]">
                                Added{' '}
                                {new Date(lead.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
                          <Badge
                            className={`${
                              STAGE_CONFIG[lead.status || 'new']?.bgColor
                            } text-[10px] font-medium px-2 py-1 capitalize`}
                          >
                            {STAGE_CONFIG[lead.status || 'new']?.label ||
                              lead.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {totalLeads} total leads
            </p>
            <Button variant="ghost" size="sm" className="gap-1">
              Sort by <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {leads.map((lead) => (
            <Link
              href={`/leads/${lead.id}`}
              key={lead.id}
              className="block group"
            >
              <Card className="border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {lead.lead_category && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${getLeadCategoryStyle(
                              lead.lead_category
                            )}`}
                          >
                            {lead.lead_category}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-base text-foreground">
                          {lead.company_name || 'Untitled Lead'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span
                          className={`flex items-center gap-1.5 ${getHotnessColor(
                            lead.hotness_score
                          )}`}
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          {lead.hotness_score || 0}% Fit
                        </span>
                        {lead.deal_timeline && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {lead.deal_timeline}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        className={`${
                          STAGE_CONFIG[lead.status || 'new']?.bgColor
                        } text-[10px] font-medium px-2 py-1 capitalize whitespace-nowrap`}
                      >
                        {STAGE_CONFIG[lead.status || 'new']?.label ||
                          lead.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}