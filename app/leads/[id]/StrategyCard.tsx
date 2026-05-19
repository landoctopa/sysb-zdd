'use client';
// app/leads/[id]/StrategyCard.tsx

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, ShieldAlert, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StrategyCard() {
  const lead = useStore($activeLead);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!lead) return null;

  const isHighPotential = lead.hotness_score && lead.hotness_score >= 70;

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Strategic Analysis
          </h3>
          {isHighPotential && (
            <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
              High Potential
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="px-5 pb-6 space-y-5 animate-in fade-in duration-200">
          {lead.strategic_analysis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Analysis
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {lead.strategic_analysis}
              </p>
            </div>
          )}

          {lead.trigger_alignment && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trigger Alignment
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lead.trigger_alignment}
              </p>
            </div>
          )}

          {lead.strategic_hurdles && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  Key Hurdles
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lead.strategic_hurdles}
              </p>
            </div>
          )}

          {lead.business_justification && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Business Justification
                </span>
              </div>
              <p className="text-sm italic text-foreground/80 leading-relaxed bg-primary/5 p-4 rounded-lg">
                “{lead.business_justification}”
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}