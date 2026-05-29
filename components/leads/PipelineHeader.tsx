'use client';
// components/leads/PipelineHeader.tsx
import React, { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Building2, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type LeadStage = Database['public']['Enums']['lead_status'];

interface PipelineHeaderProps {
  lead: Lead;
  actions: Action[];
  contacts: Contact[];
  setLead: React.Dispatch<React.SetStateAction<Lead>>;
}

const STAGES: { value: LeadStage; label: string; desc: string }[] = [
  { value: 'discovery', label: '1. Discovery', desc: 'Research & Chat' },
  { value: 'engaged', label: '2. Engaged', desc: 'Active Talk' },
  { value: 'solution_fit', label: '3. Value Fit', desc: 'Solution Matching' },
  { value: 'proposal', label: '4. Proposal', desc: 'Price Offered' },
  { value: 'negotiation', label: '5. Negotiate', desc: 'Reviewing Terms' },
  { value: 'close', label: '6. Close', desc: 'Final Verdict' },
  { value: 'post_close', label: '8. Handoff', desc: 'Getting Started' }
];

export default function PipelineHeader({ lead, actions, contacts, setLead }: PipelineHeaderProps) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const discoveryCallTask = actions.find(
    (a) => (a.metadata as any)?.task_config_id === 'log_discovery_call'
  );
  
  const currentFitScore = (discoveryCallTask?.metadata as any)?.score ?? 0;
  const hasTwoContacts = contacts.length >= 2;
  const isQualified = currentFitScore >= 8 && hasTwoContacts;

  const currentStageIndex = STAGES.findIndex((s) => s.value === lead.status);
  const nextStageObj = STAGES[currentStageIndex + 1];

  const handleAdvanceStage = (forced = false) => {
    if (!nextStageObj) return;

    const toastId = toast.loading(`Moving project to ${nextStageObj.label}...`);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: nextStageObj.value,
            metadata: { 
              stage_advanced_at: new Date().toISOString(),
              was_forced_by_user: forced 
            }
          }),
        });

        if (!response.ok) throw new Error('Update rejected');
        
        setLead((prev) => ({ ...prev, status: nextStageObj.value }));
        toast.success(`Project successfully moved to ${nextStageObj.label}!`, { id: toastId });
      } catch (err) {
        toast.error('Could not update project stage. Please try again.', { id: toastId });
      }
    });
  };

  const handleAdvanceClick = () => {
    if (!nextStageObj) return;
    
    if (lead.status === 'discovery' && !isQualified) {
      setIsWarningOpen(true);
    } else {
      handleAdvanceStage(false);
    }
  };

  return (
    /* 🛠️ VISUAL REFACTOR: Completely transparent container background layout wrapper */
    <div className="p-0 pb-2 space-y-5">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {lead.company_name || 'Unknown Company'}
              </h1>
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md border border-border/60">
                Phase {currentStageIndex + 1}: {STAGES[currentStageIndex]?.desc || lead.status}
              </Badge>
            </div>
            
            {lead.website ? (
              <a 
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-primary hover:underline font-bold flex items-center gap-1 mt-1 w-fit"
              >
                {lead.website} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="text-[11px] text-muted-foreground font-medium mt-1 italic">
                No corporate website linked yet. Add domain tracking info below.
              </p>
            )}
          </div>
        </div>

        {/* Floating action pill indicators */}
        <div className="flex items-center gap-5 bg-muted/40 p-2.5 rounded-xl border border-border/40 self-start md:self-auto shadow-sm">
          <div className="text-left space-y-0.5 px-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Overall Fit
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-foreground tracking-tight">{currentFitScore}</span>
              <span className="text-xs text-muted-foreground">/ 9</span>
            </div>
          </div>
          
          <div className="h-7 w-px bg-border/80" />

          {nextStageObj ? (
            <Button
              onClick={handleAdvanceClick}
              disabled={isPending}
              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8.5 shadow-sm px-4 gap-1 rounded-lg transition-transform active:scale-98"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Move to Phase {currentStageIndex + 2} <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          ) : (
            <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Final Stage Reached
            </div>
          )}
        </div>
      </div>

      {/* Progress Map Horizontal Flow Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-border/40">
        {STAGES.map((stg, index) => {
          const isCurrent = lead.status === stg.value;
          const isPast = index < currentStageIndex;

          return (
            <div
              key={stg.value}
              className={`rounded-lg p-2.5 text-center border transition-all relative overflow-hidden ${
                isCurrent
                  ? 'bg-muted/60 border-primary/40 text-primary font-bold shadow-inner'
                  : isPast
                  ? 'bg-muted/10 border-transparent text-muted-foreground/50 text-xs line-through opacity-60'
                  : 'bg-muted/20 border-transparent text-muted-foreground/30 text-xs'
              }`}
            >
              <span className="block truncate tracking-tight text-[11px] font-bold">{stg.label}</span>
              <span className={`block text-[9px] truncate font-semibold mt-0.5 ${isCurrent ? 'text-foreground/70' : 'text-muted-foreground/20'}`}>
                {stg.desc}
              </span>
              {isPast && (
                <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-emerald-500 rounded-bl-sm" />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent className="bg-card text-foreground border border-border/60 max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Just a quick safety check!
            </AlertDialogTitle>
            <div className="text-xs text-muted-foreground leading-relaxed pt-2 space-y-2">
              <p>
                We noticed this project doesn't have an optimal conversation fit score of 8 or higher, or at least 2 contacts saved yet.
              </p>
              <p className="bg-muted/40 p-2.5 rounded-lg border border-border/40 text-foreground/90 font-medium">
                💡 <strong>Why this matters:</strong> Getting a positive response and having backup contacts gives you a much better chance of landing a client before moving out of initial discovery chat stages.
              </p>
              <p>
                You are completely in the driver's seat, though! Would you like to advance to the next phase anyway, or take a moment to finish up your notes?
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="text-xs border-muted hover:bg-muted/50 h-8">
              Keep Working Here
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsWarningOpen(false);
                handleAdvanceStage(true);
              }}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold h-8 shadow-sm"
            >
              Advance Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}