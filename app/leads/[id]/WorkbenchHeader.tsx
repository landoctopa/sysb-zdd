'use client';

import { useStore } from '@nanostores/react';
import { $activeLead } from '@/store/leadsStore';
import { TrendingUp, Clock } from 'lucide-react';
import { StageSelector } from '@/components/iris/StageAdvanceGate';

const getProgressPercent = (status: string | null): number => {
  switch (status) {
    case 'new': return 0;
    case 'contacted': return 25;
    case 'proposal': return 50;
    case 'negotiation': return 75;
    case 'won': return 100;
    default: return 0;
  }
};

export default function WorkbenchHeader() {
  const lead = useStore($activeLead);
  if (!lead) return null;

  const progress = getProgressPercent(lead.status);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Pipeline Progress</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage selector with Iris gate */}
      <StageSelector lead={lead} coachState={(lead.ai_coach_state as Record<string, any>) || {}} />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fit Score
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{lead.hotness_score || 0}%</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{lead.deal_timeline || 'TBD'}</p>
        </div>
      </div>
    </div>
  );
}