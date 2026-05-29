'use client';
// components/leads/DiscoveryStageWorkspace.tsx

import React, { useState, useTransition } from 'react';
import { Sparkles, CheckCircle2, HelpCircle, Loader2, Check, Mail, AlertCircle, Clock, Play, UserPlus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/database.types';
import { LinkedInIcon } from '@/components/icons/LinkedIn';

import CompanyDetailsWidget from './widgets/CompanyDetailsWidget';
import ContactFormWidget from './widgets/ContactFormWidget';
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
}

export default function DiscoveryStageWorkspace({
  lead,
  actions,
  contacts,
  onActionUpdated,
  onActionCreated,
  onLeadUpdated,
  onContactCreated,
  onContactUpdated
}: DiscoveryWorkspaceProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>('verify_company_details');
  const [isCompanyWidgetOpen, setIsCompanyWidgetOpen] = useState(false);
  const [isContactWidgetOpen, setIsContactWidgetOpen] = useState(false);
  const [selectedEditContact, setSelectedEditContact] = useState<Contact | null>(null);

  const [isAiLoading, startAiTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const [fitScore, setFitScore] = useState<number | null>(null);
  const [financialImpact, setFinancialImpact] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<{ subject?: string; body?: string; message?: string } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'linkedin'>('email');

  const discoveryConfig = IRIS_PLAYBOOK.discovery;

  const databaseDiscoveryTasks = actions
    .filter(a => a.stage === 'discovery' && a.type === 'task')
    .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));

  const handleInitializePlaybook = () => {
    if (!discoveryConfig) return;

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
        task_order: task.order,
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

  const handleTriggerAiAction = (task: Action) => {
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
          <Card key={dbTask.id} className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'bg-white text-slate-900 border-2 border-slate-900 ring-4 ring-slate-900/5 shadow-md' : isCompleted ? 'border-border/40 bg-muted/10 opacity-60 text-muted-foreground' : 'border-border/60 hover:border-border/100 bg-card text-foreground'}`}>
            <div onClick={() => setExpandedTaskId(isExpanded ? null : configId)} className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer select-none ${isExpanded ? 'hover:bg-slate-50' : 'hover:bg-muted/10'}`}>
              <div className="flex items-center gap-3 min-w-0">
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Clock className={`h-4 w-4 shrink-0 ${isExpanded ? 'text-slate-900' : 'text-blue-500'}`} />}
                <span className={`font-bold text-xs tracking-tight truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>{displayTitle}</span>
              </div>
              <Badge variant="outline" className={`text-[9px] h-5 px-2 font-bold uppercase tracking-wider border-none ${isCompleted ? 'bg-emerald-500/10 text-emerald-600' : isExpanded ? 'bg-slate-900 text-white font-black' : 'bg-muted/40 text-muted-foreground'}`}>{isCompleted ? 'Done' : 'Active'}</Badge>
            </div>

            {isExpanded && (
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 space-y-4 text-xs animate-fadeIn text-slate-800">

                <div className="flex gap-2.5 leading-relaxed text-slate-600 px-1 font-medium">
                  <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{playbookTask.iris_tip}</span>
                </div>

                {/* TASK STEP 1: VERIFY DOMAINS */}
                {configId === 'verify_company_details' && (
                  <div className="pt-1 px-1 flex flex-wrap gap-2.5">
                    <Button type="button" onClick={() => setIsCompanyWidgetOpen(true)} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm">
                      {lead.website ? 'Edit details' : 'Add company details'}
                    </Button>
                    {lead.website && (
                      <Button type="button" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { verified_domain: 'manual_user_explicit_lock' })} className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700">
                        I have completed this task
                      </Button>
                    )}
                  </div>
                )}

                {/* Task Step 2 Accordion Body: Inside components/leads/DiscoveryStageWorkspace.tsx */}
                {configId === 'find_key_people' && (
                  <div className="pt-1 px-1 space-y-4">

                    {/* 🛠️ RENDER CURRENTLY ADDED CONTACTS DYNAMICALLY WITH INLINE EDIT TRIGGERS */}
                    {contacts.length > 0 && (
                      <div className="space-y-2 max-w-xl">
                        {contacts.map((person) => (
                          <div key={person.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 shadow-sm animate-fadeIn text-slate-900">
                            <div className="space-y-1 min-w-0">
                              <span className="font-bold text-slate-900 truncate text-[12px] block">{person.name}</span>
                              <span className="text-slate-500 text-[11px] font-medium block truncate">{person.role || 'No position recorded'}</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenEditContact(person)}
                              className="h-7 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 gap-1 rounded-md shrink-0 shadow-sm"
                            >
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CONTROL BUTTON LINE */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <Button
                        type="button"
                        onClick={handleOpenAddContact}
                        className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1 flex items-center"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add contact
                      </Button>

                      {/* Enforces your 2-contact playbook threshold directly on the screen face */}
                      {contacts.length >= 2 ? (
                        <Button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleCompleteTask(dbTask, { total_mapped: contacts.length })}
                          className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700 animate-fadeIn"
                        >
                          I have completed this task
                        </Button>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md px-3 h-8.5 flex items-center gap-1.5 shadow-sm select-none">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          Add {2 - contacts.length} more contact{2 - contacts.length > 1 ? 's' : ''} to complete this task.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Task Step 3: Strategy Alignment Confirmation */}
                {configId === 'pre_outreach_prep' && (
                  <div className="pt-1 px-1 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-slate-500 font-medium leading-relaxed">Confirm your outreach readiness value position strategy map.</span>
                    <Button type="button" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { user_preflight_confirmed: true })} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1 px-5 rounded-md shadow-sm shrink-0"><Check className="h-3.5 w-3.5" /> Done, I'm Ready</Button>
                  </div>
                )}

                {/* Task Step 4: Outreach Text Template Generator */}
                {configId === 'send_first_outreach' && (
                  <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-900">Outreach Assistant</span>
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button type="button" onClick={() => setSelectedChannel('email')} className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${selectedChannel === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Email</button>
                        <button type="button" onClick={() => setSelectedChannel('linkedin')} className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-0.5 transition-all ${selectedChannel === 'linkedin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>LinkedIn</button>
                      </div>
                    </div>

                    {generatedDraft && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md animate-fadeIn text-[11px] leading-relaxed text-slate-600">
                        {selectedChannel === 'email' ? (
                          <>
                            <div className="border-b border-slate-200 pb-1.5"><span className="text-[9px] text-slate-400 block font-bold uppercase">Subject Line suggestion:</span><span className="font-bold text-slate-900">{generatedDraft.subject}</span></div>
                            <div className="whitespace-pre-wrap pt-1">{generatedDraft.body}</div>
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap"><span className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Message option:</span>{generatedDraft.message}</div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button type="button" variant="outline" disabled={isAiLoading} onClick={() => handleTriggerAiAction(dbTask)} className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1">
                        {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedChannel === 'email' ? <Mail className="h-3.5 w-3.5 text-primary" /> : <LinkedInIcon size={14} />}
                        {generatedDraft ? 'Get Another Suggestion' : 'Draft Message with Iris AI'}
                      </Button>
                      <Button type="button" size="sm" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { message_sent: true, selected_channel: selectedChannel })} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm">Confirm Message Has Been Sent</Button>
                    </div>
                  </div>
                )}

                {/* Task Step 5: Discovery Conversational Metrics Form */}
                {configId === 'log_discovery_call' && (
                  <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4">
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-900 block">1. Deal Alignment Fit Check</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                          <button key={val} type="button" onClick={() => setFitScore(val)} className={`h-8 w-8 font-black text-xs rounded-lg border transition-all ${fitScore === val ? 'bg-slate-900 border-slate-900 text-white scale-105 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{val}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-900 block">2. Financial Impact Description</span>
                      <input type="text" placeholder="What is this problem costing them in revenue or time? Note it down here..." value={financialImpact} onChange={(e) => setFinancialImpact(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-400 text-slate-900 font-medium transition-colors" />
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <Button type="button" size="sm" disabled={fitScore === null || !financialImpact.trim() || isSaving} onClick={() => handleCompleteTask(dbTask, { score: fitScore, financial_impact: financialImpact.trim() })} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm">Save Details & Close Milestone</Button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </Card>
        );
      })}

      <CompanyDetailsWidget
        lead={lead}
        isOpen={isCompanyWidgetOpen}
        onClose={() => setIsCompanyWidgetOpen(false)}
        onSaveSuccess={(updatedLead) => onLeadUpdated(updatedLead)}
      />

      <ContactFormWidget
        lead={lead}
        contact={selectedEditContact}
        isOpen={isContactWidgetOpen}
        onClose={() => setIsContactWidgetOpen(false)}
        onSaveSuccess={(savedContact, isEdit) => {
          if (isEdit) {
            onContactUpdated(savedContact);
          } else {
            onContactCreated(savedContact);
          }
        }}
      />

    </div>
  );
}