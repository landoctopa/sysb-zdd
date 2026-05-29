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
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Database } from '@/database.types';
import { LinkedInIcon } from '@/components/icons/LinkedIn';

// Import your playbook configuration source of truth directly
import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';

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

  // Local interactive form element states
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [financialImpact, setFinancialImpact] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<{ subject?: string; body?: string; message?: string } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'linkedin'>('email');

  // Load the current discovery pipeline configuration block
  const discoveryConfig = IRIS_PLAYBOOK.discovery;

  // 🛠️ DATA-DRIVEN FILTER: Isolate active stage tasks and sort natively by the flat task_order column
  const stageTasks = actions
    .filter(a => a.stage === 'discovery' && a.type === 'task')
    .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));

  // --- 🔌 TRANSACTION A: INITIALIZE CHECKLIST ROWS DIRECTLY FROM PLAYBOOK CONFIG ---
  const handleInitializePlaybook = () => {
    if (!discoveryConfig) return;
    const toastId = toast.loading('Loading your discovery checklist...');
    
    // Map playbook definitions to your actions schema properties, writing the flat task_order
    const payload = discoveryConfig.tasks.map(task => {
      const clearTitle = task.title.replace('{{lead.company_name}}', lead.company_name || 'this company');
      
      return {
        lead_id: lead.id,
        stage: 'discovery',
        type: 'task',
        status: 'pending',
        channel: task.channel === 'auto' ? 'email' : 'internal',
        title: clearTitle,
        body: task.iris_tip,
        required: task.required,
        task_order: task.order, // 🛠️ Maps the explicit config order down to your flat database column
        metadata: { task_config_id: task.id }
      };
    });

    startSaveTransition(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Checklist initialization rejected');
        const generatedList = await response.json();

        if (Array.isArray(generatedList)) {
          generatedList.forEach(act => onActionCreated(act));
        } else {
          onActionCreated(generatedList);
        }
        
        toast.success('Checklist loaded successfully!', { id: toastId });
        setExpandedTaskId('verify_company_details');
      } catch (err) {
        toast.error('Could not load your playbook items. Please try again.', { id: toastId });
      }
    });
  };

  // --- 📋 TRANSACTION B: WRITE TASK AS COMPLETED & SEQUENTIALLY SHIFT FOCUS ---
  const handleCompleteTask = (task: Action, customMeta: Record<string, any> = {}) => {
    const toastId = toast.loading('Saving your progress...');
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
        toast.success('Progress saved!', { id: toastId });

        // Since stageTasks is pre-sorted by task_order, finding the next pending item is perfectly sequential!
        const nextPending = stageTasks.find(t => t.id !== task.id && t.status === 'pending');
        setExpandedTaskId(nextPending ? (nextPending.metadata as any)?.task_config_id : null);
      } catch (err) {
        toast.error('Could not save milestone status. Please try again.', { id: toastId });
      }
    });
  };

  // --- 🤖 TRANSACTION C: REQUEST PERSONALIZED DRAFT OUTREACH FROM DEEPSEEK ---
  const handleTriggerAiAction = (task: Action) => {
    setGeneratedDraft(null);
    const toastId = toast.loading('Iris is compiling your message draft...');

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

        if (!response.ok) throw new Error('Generation rejected');
        const result = await response.json();

        setGeneratedDraft(result);
        toast.success('Personalized draft is ready to review!', { id: toastId });
      } catch (err) {
        toast.error('AI assistant was unable to assemble a template right now.', { id: toastId });
      }
    });
  };

  // Unseeded State View Container
  if (stageTasks.length === 0) {
    return (
      <Card className="p-8 border border-dashed border-primary/30 text-center space-y-4 bg-primary/5 rounded-xl">
        <div className="mx-auto h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-sm font-bold text-foreground">Let's get started on Discovery</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {discoveryConfig?.goal || 'Learn about the business, connect with the right people, and see if there is a qualified fit.'}
          </p>
        </div>
        <Button 
          onClick={handleInitializePlaybook} 
          disabled={isSaving}
          className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow px-4 gap-1.5"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          Load Discovery Checklist
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* 🛠️ NATIVE DATA-DRIVEN LOOP: Maps directly over rows pre-sorted by task_order */}
      {stageTasks.map((dbTask) => {
        const configId = (dbTask.metadata as any)?.task_config_id || '';
        const isCompleted = dbTask.status === 'completed';
        const isExpanded = expandedTaskId === configId;

        return (
          <Card 
            key={dbTask.id} 
            className={`border transition-all duration-200 overflow-hidden shadow-sm ${
              isExpanded 
                ? 'border-primary/50 bg-card' 
                : isCompleted 
                ? 'border-border/40 bg-muted/10 opacity-80' 
                : 'border-border/60 hover:border-border/100 bg-card'
            }`}
          >
            {/* INTERACTIVE ACCORDION TOGGLE ROW */}
            <div
              onClick={() => setExpandedTaskId(isExpanded ? null : configId)}
              className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <span className={`font-bold text-xs tracking-tight truncate ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {dbTask.title}
                </span>
              </div>
              
              <Badge 
                variant={isCompleted ? 'secondary' : isExpanded ? 'default' : 'outline'} 
                className={`text-[9px] h-5 px-2 font-bold uppercase tracking-wider ${
                  isCompleted 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none' 
                    : 'text-muted-foreground'
                }`}
              >
                {isCompleted ? 'Done' : 'Active'}
              </Badge>
            </div>

            {/* EXPANDABLE WORKSPACE WRAPPER PANELS */}
            {isExpanded && (
              <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 text-xs animate-fadeIn">
                
                {/* Descriptive Tip Context box */}
                <div className="text-muted-foreground bg-background p-3 border border-border/40 rounded-lg flex gap-2.5 leading-relaxed shadow-sm">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{dbTask.body}</span>
                </div>

                {/* Task Module 1: Verify Core Details */}
                {configId === 'verify_company_details' && (
                  <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="font-bold text-foreground">Available Integrations</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Apollo, Lusha</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5" onClick={() => toast.info('Checking records via connected Apollo fields...')}>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Use Apollo Lookup
                      </Button>
                      <div className="ml-auto">
                        <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { verified_domain: 'success_verified' })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-4">
                          Confirm Details are Correct
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Module 2: Buying Committee Multi-threading */}
                {configId === 'find_key_people' && (
                  <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="font-bold text-foreground">Minimum Target: 2 Contacts</span>
                      <Badge variant={contacts.length >= 2 ? 'outline' : 'secondary'} className={`text-[10px] font-bold ${contacts.length >= 2 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}`}>
                        Currently Saved: {contacts.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {contacts.length >= 2 ? '✅ Ready to lock in!' : '⚠️ Please add at least 2 people in your Contacts tab before finishing.'}
                      </span>
                      <Button type="button" size="sm" disabled={contacts.length < 2 || isSaving} onClick={() => handleCompleteTask(dbTask, { total_mapped: contacts.length })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-4">
                        Confirm Contacts are Logged
                      </Button>
                    </div>
                  </div>
                )}

                {/* Task Module 3: Strategy Alignment Confirmation */}
                {configId === 'pre_outreach_prep' && (
                  <div className="flex items-center justify-between gap-4 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                    <span className="text-muted-foreground text-[11px] leading-relaxed max-w-md">
                      Take a quick second to review your notes on their background and confirm you are ready to reach out.
                    </span>
                    <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { user_preflight_confirmed: true })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground gap-1 px-4 shrink-0">
                      <Check className="h-3.5 w-3.5" /> Done, I'm Ready
                    </Button>
                  </div>
                )}

                {/* Task Module 4: Outreach Text Template Generator */}
                {configId === 'send_first_outreach' && (
                  <div className="space-y-3 bg-background p-3 border border-border/40 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="font-bold text-foreground">Outreach Assistant</span>
                      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
                        <button type="button" onClick={() => setSelectedChannel('email')} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedChannel === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground/70'}`}>Email</button>
                        <button type="button" onClick={() => setSelectedChannel('linkedin')} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-0.5 ${selectedChannel === 'linkedin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground/70'}`}>LinkedIn</button>
                      </div>
                    </div>

                    {generatedDraft && (
                      <div className="space-y-3 p-3 bg-muted/30 border border-border/40 rounded-lg animate-fadeIn text-[11px] leading-relaxed">
                        {selectedChannel === 'email' ? (
                          <>
                            <div className="border-b border-border/40 pb-1.5"><span className="text-[9px] text-muted-foreground block font-bold uppercase">Subject Line suggestion:</span><span className="font-bold text-foreground">{generatedDraft.subject}</span></div>
                            <div className="whitespace-pre-wrap text-muted-foreground pt-1">{generatedDraft.body}</div>
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap text-muted-foreground"><span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Message option:</span>{generatedDraft.message}</div>
                        )}
                        <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-primary" /> Copy this draft into your mailbox or messaging app.
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" disabled={isAiLoading} onClick={() => handleTriggerAiAction(dbTask)} className="h-8 text-xs font-semibold gap-1">
                        {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedChannel === 'email' ? <Mail className="h-3.5 w-3.5 text-primary" /> : <LinkedInIcon size={14} />}
                        {generatedDraft ? 'Get Another Suggestion' : 'Draft Message with Iris AI'}
                      </Button>
                      <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { message_sent: true, selected_channel: selectedChannel })} className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-4">
                        Confirm Message Has Been Sent
                      </Button>
                    </div>
                  </div>
                )}

                {/* Task Module 5: Discovery Conversational Metrics Form */}
                {configId === 'log_discovery_call' && (
                  <div className="space-y-4 bg-background p-4 border border-border/40 rounded-lg shadow-sm">
                    <div className="space-y-2">
                      <span className="font-bold text-foreground block">1. Deal Alignment Fit (1 = Cold, 9 = Perfect Fit)</span>
                      <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFitScore(val)}
                            className={`h-8 w-8 font-bold text-xs rounded-lg border transition-all ${fitScore === val ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-sm' : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-foreground block">2. Financial Impact Notes (e.g., losing $10k/month on errors)</span>
                      <input
                        type="text"
                        placeholder="What is this problem costing them in revenue or time? Note it down here..."
                        value={financialImpact}
                        onChange={(e) => setFinancialImpact(e.target.value)}
                        className="w-full bg-muted/10 border border-border focus:border-primary/50 text-xs px-3 h-9 rounded-lg focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <Button 
                        type="button" 
                        size="sm" 
                        disabled={fitScore === null || !financialImpact.trim() || isSaving} 
                        onClick={() => handleCompleteTask(dbTask, { score: fitScore, financial_impact: financialImpact.trim() })} 
                        className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-4"
                      >
                        Save Details & Close Milestone
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}