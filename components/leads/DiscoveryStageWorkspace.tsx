'use client';
// components/leads/DiscoveryStageWorkspace.tsx

import React, { useState, useTransition, useEffect } from 'react';
import { Sparkles, CheckCircle2, HelpCircle, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/database.types';

// Import decoupled modals
import CompanyDetailsWidget from './widgets/CompanyDetailsWidget';
import ContactFormWidget from './widgets/ContactFormWidget';
import PreOutreachPrepWidget from './widgets/PreOutreachPrepWidget';

// 🛠️ NEW IMPORTS: Decoupled step workspace subcomponents
import Step1VerifyCompany from './discovery/Step1VerifyCompany';
import Step2FindPeople from './discovery/Step2FindPeople';
import Step3PreOutreachPrep from './discovery/Step3PreOutreachPrep';
import Step4SendOutreach from './discovery/Step4SendOutreach';
import Step5LogDiscoveryCall from './discovery/Step5LogDiscoveryCall';

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
  onLeadUpdated: React.Dispatch<React.SetStateAction<Lead>>;
  onContactCreated: (contact: Contact) => void;
  onContactUpdated: (contact: Contact) => void;
  onContactDeleted: (id: string) => void;
}

export default function DiscoveryStageWorkspace({
  lead,
  actions,
  contacts,
  onActionUpdated,
  onActionCreated,
  onLeadUpdated,
  onContactCreated,
  onContactUpdated,
  onContactDeleted
}: DiscoveryWorkspaceProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);

  const [isCompanyWidgetOpen, setIsCompanyWidgetOpen] = useState(false);
  const [isContactWidgetOpen, setIsContactWidgetOpen] = useState(false);
  const [isPrepWidgetOpen, setIsPrepWidgetOpen] = useState(false);
  const [selectedEditContact, setSelectedEditContact] = useState<Contact | null>(null);

  const [isAiLoading, startAiTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [generatedDraft, setGeneratedDraft] = useState<{ subject?: string; body?: string; message?: string } | null>(null);

  const discoveryConfig = IRIS_PLAYBOOK.discovery;

  // Filter and sort tasks from your unified polymorphic actions ledger
  const databaseDiscoveryTasks = actions
    .filter((a) => {
      const meta = (a.metadata as Record<string, any>) || {};
      const taskStage = a.pipeline_stage || meta.stage; // Checks root column, falls back to metadata block
      return a.type === 'task' && taskStage === 'discovery';
    })
    .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));

  // Determine current active task step dynamically on page load
  useEffect(() => {
    if (databaseDiscoveryTasks.length > 0 && !hasInitializedExpanded) {
      const firstPendingTask = databaseDiscoveryTasks.find(t => t.status === 'pending');
      if (firstPendingTask) {
        setExpandedTaskId((firstPendingTask.metadata as any)?.task_config_id || null);
      } else {
        setExpandedTaskId('log_discovery_call');
      }
      setHasInitializedExpanded(true); // 🛠️ FIXED: Added "set" prefix to invoke state setter
    }
  }, [actions, hasInitializedExpanded, databaseDiscoveryTasks]);

  const handleInitializePlaybook = () => {
    if (!discoveryConfig) return;

    const payload = discoveryConfig.tasks.map(task => {
      const clearTitle = task.title.replace('{{lead.company_name}}', lead.company_name || 'this company');
      return {
        lead_id: lead.id,
        pipeline_stage: 'discovery', // Write directly to the new database column field root
        type: 'task',
        status: 'pending',
        channel: task.channel === 'auto' ? 'email' : 'internal',
        title: clearTitle,
        body: task.iris_tip,
        required: task.required,
        task_order: task.order,
        metadata: {
          task_config_id: task.id,
          stage: 'discovery' // Legacy tracker fallback compatibility layer
        }
      };
    });

    startSaveTransition(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Seeding failed');
        const generatedList = await response.json();

        if (Array.isArray(generatedList)) {
          generatedList.forEach(act => onActionCreated(act));
        } else {
          onActionCreated(generatedList);
        }
        setExpandedTaskId('verify_company_details');
      } catch (err) { }
    });
  };

  const handleCompleteTask = (task: Action, customMeta: Record<string, any> = {}) => {
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
        if (!response.ok) throw new Error('Update rejected');
        const updated = await response.json();

        onActionUpdated(updated);

        if (discoveryConfig) {
          const nextConfigTask = discoveryConfig.tasks.find(t => {
            const match = databaseDiscoveryTasks.find(db => (db.metadata as any)?.task_config_id === t.id);
            if (match?.id === task.id) return false;
            return !match || match.status === 'pending';
          });
          setExpandedTaskId(nextConfigTask ? nextConfigTask.id : null);
        }
      } catch (err) { }
    });
  };

  const handleTriggerAiAction = (task: Action, selectedChannel: 'email' | 'linkedin') => {
    setGeneratedDraft(null);
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
        if (!response.ok) throw new Error('Generation failed');
        const result = await response.json();
        setGeneratedDraft(result);
      } catch (err) { }
    });
  };

  const handleOpenAddContact = () => {
    setSelectedEditContact(null);
    setIsContactWidgetOpen(true);
  };

  const handleOpenEditContact = (targetContact: Contact) => {
    setSelectedEditContact(targetContact);
    setIsContactWidgetOpen(true);
  };

  if (databaseDiscoveryTasks.length === 0) {
    return (
      <Card className="p-8 border border-dashed border-primary/30 text-center space-y-4 bg-primary/5 rounded-xl">
        <div className="mx-auto h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Sparkles className="h-5 w-5" /></div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-sm font-bold text-foreground">Let's get started on Discovery</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{discoveryConfig?.goal}</p>
        </div>
        <Button onClick={handleInitializePlaybook} disabled={isSaving} className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow px-4 gap-1.5"><Play className="h-3.5 w-3.5 fill-current" /> Load Discovery Checklist</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {discoveryConfig?.tasks.map((playbookTask) => {
        const dbTask = databaseDiscoveryTasks.find(a => (a.metadata as any)?.task_config_id === playbookTask.id);
        if (!dbTask) return null;

        const configId = playbookTask.id;
        const isCompleted = dbTask.status === 'completed';
        const isExpanded = expandedTaskId === configId;
        const displayTitle = playbookTask.title.replace('{{lead.company_name}}', lead.company_name || 'this company');

        return (
          <Card
            key={dbTask.id}
            className={`transition-all duration-200 overflow-hidden ${isExpanded
              ? 'bg-white text-slate-900 border-2 border-slate-900 ring-4 ring-slate-900/5 shadow-md'
              : isCompleted
                ? 'bg-slate-100 border border-slate-200 shadow-sm text-slate-700'
                : 'border-border/60 hover:border-border/100 bg-card text-foreground'
              }`}
          >
            {/* COMMON EXPANSION TRIGGER CONTAINER */}
            <div
              onClick={() => setExpandedTaskId(isExpanded ? null : configId)}
              className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer select-none ${isExpanded ? 'hover:bg-slate-50' : isCompleted ? 'hover:bg-slate-200/60' : 'hover:bg-muted/10'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className={`h-4 w-4 shrink-0 ${isExpanded ? 'text-slate-900' : 'text-blue-500'}`} />
                )}
                <span className={`font-bold text-xs tracking-tight truncate ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                  {displayTitle}
                </span>
              </div>

              <Badge variant="outline" className={`text-[9px] h-5 px-2 font-bold uppercase tracking-wider border-none ${isCompleted ? 'bg-emerald-600/10 text-emerald-700' : isExpanded ? 'bg-slate-900 text-white font-black' : 'bg-muted/40 text-muted-foreground'}`}>{isCompleted ? 'Done' : 'Active'}</Badge>
            </div>

            {/* DELEGATE ACTIVE UI RENDER ROUTE TO DECOUPLED CHILD */}
            {isExpanded && (
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 space-y-4 text-xs animate-fadeIn text-slate-800">

                <div className="flex gap-2.5 leading-relaxed text-slate-600 px-1 font-medium">
                  <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{playbookTask.iris_tip}</span>
                </div>

                {configId === 'verify_company_details' && (
                  <Step1VerifyCompany
                    lead={lead}
                    dbTask={dbTask}
                    isSaving={isSaving}
                    onOpenWidget={() => setIsCompanyWidgetOpen(true)}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'find_key_people' && (
                  <Step2FindPeople
                    dbTask={dbTask}
                    contacts={contacts}
                    isSaving={isSaving}
                    onAddPerson={handleOpenAddContact}
                    onEditPerson={handleOpenEditContact}
                    onDeletePerson={onContactDeleted}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'pre_outreach_prep' && (
                  <Step3PreOutreachPrep
                    lead={lead}
                    dbTask={dbTask}
                    contacts={contacts}
                    isSaving={isSaving}
                    onOpenPrepWidget={() => setIsPrepWidgetOpen(true)}
                    onActionUpdated={onActionUpdated}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'send_first_outreach' && (
                  <Step4SendOutreach
                    lead={lead}
                    dbTask={dbTask}
                    actions={actions} // 🛠️ Added property injection link
                    isSaving={isSaving}
                    onActionUpdated={onActionUpdated}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'log_discovery_call' && (
                  <Step5LogDiscoveryCall
                    lead={lead}
                    dbTask={dbTask}
                    actions={actions}
                    contacts={contacts}
                    isSaving={isSaving}
                    onActionUpdated={onActionUpdated}
                    onCompleteTask={handleCompleteTask}
                    onContactUpdated={onContactUpdated}
                  />
                )}

              </div>
            )}
          </Card>
        );
      })}

      <CompanyDetailsWidget lead={lead} isOpen={isCompanyWidgetOpen} onClose={() => setIsCompanyWidgetOpen(false)} onSaveSuccess={(updatedLead) => onLeadUpdated(updatedLead)} />
      <ContactFormWidget lead={lead} contact={selectedEditContact} isOpen={isContactWidgetOpen} onClose={() => setIsContactWidgetOpen(false)} onSaveSuccess={(savedContact, isEdit) => { if (isEdit) { onContactUpdated(savedContact); } else { onContactCreated(savedContact); } }} />
      {databaseDiscoveryTasks.find(a => (a.metadata as any)?.task_config_id === 'pre_outreach_prep') && (
        <PreOutreachPrepWidget
          dbTask={databaseDiscoveryTasks.find(a => (a.metadata as any)?.task_config_id === 'pre_outreach_prep')!}
          isOpen={isPrepWidgetOpen}
          onClose={() => setIsPrepWidgetOpen(false)}
          onSaveSuccess={(updatedAction) => onActionUpdated(updatedAction)}
        />
      )}
    </div>
  );
}