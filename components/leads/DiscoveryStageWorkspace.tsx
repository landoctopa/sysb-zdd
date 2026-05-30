'use client';
// components/leads/DiscoveryStageWorkspace.tsx

import React, { useState, useTransition, useEffect } from 'react';
import { Sparkles, CheckCircle2, HelpCircle, Loader2, Check, Mail, AlertCircle, Clock, Play, UserPlus, Edit3, Trash2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/database.types';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { toast } from 'sonner';

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
  const [selectedEditContact, setSelectedEditContact] = useState<Contact | null>(null);

  const [isAiLoading, startAiTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  // 🛠️ STEP 3 SPIN FRAMEWORK COMPOSITION STATES
  const [spinSituation, setSpinSituation] = useState('');
  const [spinProblem, setSpinProblem] = useState('');
  const [spinImplication, setSpinImplication] = useState('');
  const [spinNeedPayoff, setSpinNeedPayoff] = useState('');

  // Step 4 & 5 local tracking states
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [financialImpact, setFinancialImpact] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<{ subject?: string; body?: string; message?: string } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'linkedin'>('email');

  const discoveryConfig = IRIS_PLAYBOOK.discovery;

  const databaseDiscoveryTasks = actions
    .filter(a => a.stage === 'discovery' && a.type === 'task')
    .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));

  // Auto-expand active task on page load
  useEffect(() => {
    if (databaseDiscoveryTasks.length > 0 && !hasInitializedExpanded) {
      const firstPendingTask = databaseDiscoveryTasks.find(t => t.status === 'pending');
      if (firstPendingTask) {
        setExpandedTaskId((firstPendingTask.metadata as any)?.task_config_id || null);
      } else {
        setExpandedTaskId('log_discovery_call');
      }
      setHasInitializedExpanded(true);
    }
  }, [actions, hasInitializedExpanded, databaseDiscoveryTasks]);

  // 🛠️ AUTOMATIC IRIS ROSTER ANALYSIS TRIGGER
  // Runs automatically the moment the user views Step 3, evaluating saved contacts via your filtering skill
  useEffect(() => {
    if (expandedTaskId !== 'pre_outreach_prep' || contacts.length === 0) return;

    const prepTask = databaseDiscoveryTasks.find(
      t => (t.metadata as any)?.task_config_id === 'pre_outreach_prep'
    );
    if (!prepTask || prepTask.status === 'completed') return;

    const currentMeta = (prepTask.metadata as Record<string, any>) || {};
    
    // If Iris analysis is already saved in the metadata column, skip the API call
    if (currentMeta.people_analysis) {
      // Pre-hydrate the SPIN form fields if the user has already typed partial answers earlier
      if (currentMeta.spin_framework) {
        setSpinSituation(currentMeta.spin_framework.situation || '');
        setSpinProblem(currentMeta.spin_framework.problem || '');
        setSpinImplication(currentMeta.spin_framework.implication || '');
        setSpinNeedPayoff(currentMeta.spin_framework.need_payoff || '');
      }
      return;
    }

    // Otherwise, automatically invoke the AI text engine using your backend skill route
    startAiTransition(async () => {
      try {
        const response = await fetch('/api/iris/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            action_key: 'analyze_people_roster', // Tells backend to fire your contact-persona-filtering skill prompt
            task_id: prepTask.id
          }),
        });

        if (!response.ok) throw new Error('AI analysis failed');
        const result = await response.json();

        // Persist Iris's output right into the action metadata column so it loads instantly next time
        const updateRes = await fetch(`/api/actions/${prepTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...currentMeta,
              people_analysis: result.analysis || result.message || 'No direct recommendation returned.'
            }
          })
        });

        if (updateRes.ok) {
          const updatedAction = await updateRes.json();
          onActionUpdated(updatedAction); // Sync changes to state smoothly
        }
      } catch (err) {
        console.error('[Automated Iris Roster Check Error]:', err);
      }
    });
  }, [expandedTaskId, contacts, databaseDiscoveryTasks, lead.id, onActionUpdated]);

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
      } catch (err) {}
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
      } catch (err) {}
    });
  };

  const handleDeleteContact = async (id: string) => {
    const toastId = toast.loading('Removing person from roster...');
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete rejected');
      
      toast.success('Person removed from roster.', { id: toastId });
      onContactDeleted(id);
    } catch (err) {
      toast.error('Could not update roster records.', { id: toastId });
    }
  };

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
            className={`transition-all duration-200 overflow-hidden ${
              isExpanded 
                ? 'bg-white text-slate-900 border-2 border-slate-900 ring-4 ring-slate-900/5 shadow-md' 
                : isCompleted 
                ? 'bg-slate-100 border border-slate-200 shadow-sm text-slate-700' 
                : 'border-border/60 hover:border-border/100 bg-card text-foreground'
            }`}
          >
            {/* ACCORDION ROW HEADER */}
            <div
              onClick={() => setExpandedTaskId(isExpanded ? null : configId)}
              className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer select-none ${
                isExpanded ? 'hover:bg-slate-50' : isCompleted ? 'hover:bg-slate-200/60' : 'hover:bg-muted/10'
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
              
              <Badge 
                variant="outline"
                className={`text-[9px] h-5 px-2 font-bold uppercase tracking-wider border-none ${
                  isCompleted 
                    ? 'bg-emerald-600/10 text-emerald-700' 
                    : isExpanded 
                    ? 'bg-slate-900 text-white font-black' 
                    : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                {isCompleted ? 'Done' : 'Active'}
              </Badge>
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

                {/* TASK STEP 2: STAKEHOLDER MAPPING LOOP */}
                {configId === 'find_key_people' && (
                  <div className="pt-1 px-1 space-y-4 w-full">
                    {contacts.length > 0 && (
                      <div className="space-y-2 w-full animate-fadeIn">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 mb-1 select-none">Added people</div>
                        {contacts.map((person) => (
                          <div key={person.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 shadow-sm w-full text-slate-900">
                            <div className="space-y-0.5 min-w-0">
                              <span className="font-bold text-slate-900 truncate text-[12px] block">{person.name}</span>
                              <span className="text-slate-500 text-[11px] font-medium block truncate">{person.role || 'No position recorded'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button type="button" variant="outline" onClick={() => handleOpenEditContact(person)} className="h-7.5 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 px-3 rounded-md shadow-sm">Edit</Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteContact(person.id)} className="h-7.5 w-7.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <Button type="button" onClick={handleOpenAddContact} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1 flex items-center"><UserPlus className="h-3.5 w-3.5" /> Add person</Button>
                      {contacts.length >= 2 ? (
                        <Button type="button" disabled={isSaving} onClick={() => handleCompleteTask(dbTask, { total_mapped: contacts.length })} className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700">I have completed this task</Button>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md px-3 h-8.5 flex items-center gap-1.5 shadow-sm select-none text-slate-900"><AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Add {2 - contacts.length} more person to complete this task.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 🛠️ TASK STEP 3: PRE-OUTREACH SPIN SHEET & LLM BACKEND PERSONA QUALIFICATION */}
                {configId === 'pre_outreach_prep' && (
                  <div className="pt-1 px-1 space-y-6 w-full text-slate-900">
                    
                    {/* SPIN Canvas Input Form */}
                    <div className="space-y-4 bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5 select-none">
                        Outreach Strategy Sheet
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">What is their current setup?</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Tracking their supply chain manually on basic spreadsheet forms."
                            value={spinSituation} 
                            onChange={(e) => setSpinSituation(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">What is going wrong or frustrating them?</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Shipment boxes get delayed and inventory columns drop silently."
                            value={spinProblem} 
                            onChange={(e) => setSpinProblem(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">What happens if they don't fix this? (True Cost)</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Losing roughly 10% of vendor margins due to unexpected tracking errors."
                            value={spinImplication} 
                            onChange={(e) => setSpinImplication(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">How do we fix this or make their life easier?</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Automate tracking lines entirely, cutting audit times to 5 minutes."
                            value={spinNeedPayoff} 
                            onChange={(e) => setSpinNeedPayoff(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Iris Analysis Output derived via your custom contact-persona-filtering backend logic */}
                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 select-none flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-slate-900 shrink-0" /> Iris's thoughts on who to reach out to
                      </div>

                      {(dbTask.metadata as any)?.people_analysis ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap font-medium animate-fadeIn">
                          {(dbTask.metadata as any).people_analysis}
                        </div>
                      ) : isAiLoading ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-center gap-2 text-slate-400 text-[11px] py-6 font-medium">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> 
                          Iris is evaluating your saved profiles using the contact sorting skill...
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-slate-400 text-[11px] text-center py-4 font-medium italic">
                          Add people in the previous step to enable automatic Iris recommendations.
                        </div>
                      )}
                    </div>

                    {/* Completion control trigger button */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        disabled={!spinSituation.trim() || !spinProblem.trim() || !spinImplication.trim() || !spinNeedPayoff.trim() || isSaving}
                        onClick={() => handleCompleteTask(dbTask, {
                          user_preflight_confirmed: true,
                          spin_framework: {
                            situation: spinSituation.trim(),
                            problem: spinProblem.trim(),
                            implication: spinImplication.trim(),
                            need_payoff: spinNeedPayoff.trim()
                          }
                        })}
                        className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 px-5 rounded-md shadow-sm transition-all"
                      >
                        Lock in strategy & unlock messages
                      </Button>
                    </div>

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