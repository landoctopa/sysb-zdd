'use client';
// components/leads/discovery/Step3PreOutreachPrep.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, FileText, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react';
import { Database } from '@/database.types';
import PreOutreachPrepWidget from '../widgets/PreOutreachPrepWidget';

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
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};
  const hasStrategySaved = !!currentMeta.spin_framework;
  
  const rawAnalysis = currentMeta.people_analysis || '';
  const hasValidAnalysis = 
    rawAnalysis.trim().length > 0 && 
    !rawAnalysis.includes('No direct recommendation') && 
    !rawAnalysis.includes('"error"') &&
    !rawAnalysis.includes('error');

  const triggerIrisAnalysis = async () => {
    if (contacts.length === 0) return;

    setIsAiLoading(true);

    try {
      // ── 🛠️ FIX: Using Pattern 2 to send the prompt and context directly, bypassing orchestrator restrictions
      const response = await fetch('/api/iris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Incorporates the exact guidelines from your persona filtering skill
          system_prompt: `
            ## SKILL: CONTACT SORTING AND FILTERING
            Your goal is to look at a list of people found at a company and help the user find the best person to talk to.
            * Look closely at job titles. Look for owners, founders, managers, or directors who are in charge of the department matching what the user offers.
            * Highlight the top 1 or 2 people who are most likely to have the authority to greenlight a project or talk about business challenges.
            * Provide a clear, simple, plain-English explanation for why this person is the best target and what specific angle or approach to use.
          `,
          context: {
            company_name: lead.company_name,
            industry: lead.industry,
            people_list: contacts.map(c => ({ name: c.name, role: c.role, notes: c.notes }))
          },
          output_format: {
            recommendation: "A clean, simple explanation showing who to contact first, why them, and what specific angle or approach to take based on their role."
          }
        }),
      });

      if (!response.ok) throw new Error('AI analysis failed');
      const result = await response.json();

      // Extract the structured recommendation string returned from the direct endpoint
      const analysisPayload = result.recommendation || result.message || JSON.stringify(result);

      const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            people_analysis: analysisPayload
          }
        })
      });

      if (updateRes.ok) {
        const updatedAction = await updateRes.json();
        onActionUpdated(updatedAction);
      }
    } catch (err) {
      console.error('[Automated Iris Roster Check Error]:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (contacts.length > 0 && dbTask.status !== 'completed' && !hasValidAnalysis && !isAiLoading) {
      triggerIrisAnalysis();
    }
  }, [contacts.length, dbTask.status, hasValidAnalysis]);

  return (
    <div className="pt-1 px-1 space-y-5 w-full text-slate-900">
      
      {/* Action Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1.5 flex items-center"
        >
          <FileText className="h-3.5 w-3.5" /> {hasStrategySaved ? 'Edit Review Notes' : 'Do Pre-Outreach Review'}
        </Button>

        {hasStrategySaved && (
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 h-8.5 flex items-center gap-1 rounded-md shadow-sm select-none animate-fadeIn">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pre-Outreach Notes Saved
          </div>
        )}
      </div>

      {/* Iris Thoughts View */}
      <div className="space-y-2.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 select-none flex items-center justify-between gap-4 w-full">
          <span className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-slate-900 shrink-0" /> Iris's thoughts on who to reach out to
          </span>
          
          {contacts.length > 0 && !isAiLoading && (
            <button 
              type="button" 
              onClick={triggerIrisAnalysis}
              className="text-[10px] text-slate-400 hover:text-slate-900 font-bold transition-colors flex items-center gap-1 normal-case tracking-normal"
            >
              <RotateCw className="h-3 w-3" /> Re-analyze people
            </button>
          )}
        </div>

        {contacts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-slate-400 text-[11px] text-center py-4 font-medium italic">
            Add people in the previous step to enable automatic Iris recommendations.
          </div>
        ) : isAiLoading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-center gap-2 text-slate-400 text-[11px] py-6 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> 
            Iris is running your contact qualification filter skill...
          </div>
        ) : hasValidAnalysis ? (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap font-medium animate-fadeIn">
            {currentMeta.people_analysis}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm text-slate-500 text-[11px] text-center space-y-2.5 font-medium">
            <div className="flex items-center justify-center gap-1.5 text-amber-600 font-bold"><AlertTriangle className="h-4 w-4" /> No analysis recorded yet</div>
            <p className="text-slate-400 max-w-sm mx-auto text-[10px] leading-normal">You have added {contacts.length} people to this lead profile. Click below to prompt Iris to filter targets.</p>
            <Button type="button" variant="outline" size="sm" onClick={triggerIrisAnalysis} className="h-7 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded px-3">
              Analyze People List
            </Button>
          </div>
        )}
      </div>

      {/* Complete Task Controls */}
      {dbTask.status !== 'completed' && hasStrategySaved && (
        <div className="pt-1">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => onCompleteTask(dbTask, { user_preflight_confirmed: true })}
            className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700 animate-fadeIn"
          >
            I have completed this task
          </Button>
        </div>
      )}

      <PreOutreachPrepWidget
        dbTask={dbTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={onActionUpdated}
      />

    </div>
  );
}