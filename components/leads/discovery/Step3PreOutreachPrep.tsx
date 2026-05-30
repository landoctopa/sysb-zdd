'use client';
// components/leads/discovery/Step3PreOutreachPrep.tsx

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, AlertCircle } from 'lucide-react';
import { Database } from '@/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Step3Props {
  lead: Lead;
  dbTask: Action;
  contacts: Contact[];
  isSaving: boolean;
  onActionUpdated: (action: Action) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step3PreOutreachPrep({
  lead,
  dbTask,
  contacts,
  isSaving,
  onActionUpdated,
  onCompleteTask
}: Step3Props) {
  const [isAiLoading, startAiTransition] = useTransition();

  const [spinSituation, setSpinSituation] = useState('');
  const [spinProblem, setSpinProblem] = useState('');
  const [spinImplication, setSpinImplication] = useState('');
  const [spinNeedPayoff, setSpinNeedPayoff] = useState('');

  // 🛠️ Automatic Background Evaluation trigger
  useEffect(() => {
    if (contacts.length === 0 || dbTask.status === 'completed') return;

    const currentMeta = (dbTask.metadata as Record<string, any>) || {};
    
    if (currentMeta.people_analysis) {
      if (currentMeta.spin_framework) {
        setSpinSituation(currentMeta.spin_framework.situation || '');
        setSpinProblem(currentMeta.spin_framework.problem || '');
        setSpinImplication(currentMeta.spin_framework.implication || '');
        setSpinNeedPayoff(currentMeta.spin_framework.need_payoff || '');
      }
      return;
    }

    startAiTransition(async () => {
      try {
        const response = await fetch('/api/iris/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            action_key: 'analyze_people_roster',
            task_id: dbTask.id
          }),
        });

        if (!response.ok) throw new Error('AI analysis failed');
        const result = await response.json();

        const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
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
          onActionUpdated(updatedAction);
        }
      } catch (err) {
        console.error('[Automated Iris Roster Check Error]:', err);
      }
    });
  }, [contacts, dbTask, lead.id, onActionUpdated]);

  return (
    <div className="pt-1 px-1 space-y-6 w-full text-slate-900">
      
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

      <div className="pt-2">
        <Button
          type="button"
          disabled={!spinSituation.trim() || !spinProblem.trim() || !spinImplication.trim() || !spinNeedPayoff.trim() || isSaving}
          onClick={() => onCompleteTask(dbTask, {
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
  );
}