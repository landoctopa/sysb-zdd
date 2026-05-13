'use client';

import { useStore } from '@nanostores/react';
import { $activeLead, updateLeadStatus, $isSyncing, $activeCoachLogs } from '@/store/leadsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Clock, Loader2 } from 'lucide-react';

const STAGES = [
  { value: 'new', label: 'New', color: 'text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'text-purple-400' },
  { value: 'proposal', label: 'Proposal', color: 'text-amber-400' },
  { value: 'negotiation', label: 'Negotiation', color: 'text-orange-400' },
  { value: 'won', label: 'Won', color: 'text-emerald-400' },
  { value: 'lost', label: 'Lost', color: 'text-rose-400' },
];

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
  const isSyncing = useStore($isSyncing);

  if (!lead) return null;

  const progress = getProgressPercent(lead.status);

  const handleStageChange = async (newStatus: string) => {
    await updateLeadStatus(newStatus);
    // After status update, refresh coach
    const res = await fetch(`/api/leads/${lead.id}/coach`, { method: 'POST' });
    if (res.ok) {
      const newLog = await res.json();
      const currentLogs = $activeCoachLogs.get();
      $activeCoachLogs.set([newLog, ...currentLogs]);
    }
  };

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

      {/* Stage selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pipeline Stage
          </label>
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        <Select value={lead.status ?? undefined} onValueChange={handleStageChange}>
          <SelectTrigger className="w-full h-11 rounded-lg bg-muted/30 border-border/60 font-medium">
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value} className={stage.color}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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