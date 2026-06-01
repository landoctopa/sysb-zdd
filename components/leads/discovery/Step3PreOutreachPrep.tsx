'use client';
// components/leads/discovery/Step3PreOutreachPrep.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, FileText, CheckCircle2, RotateCw, AlertTriangle, ArrowUpRight, Badge } from 'lucide-react';
import { Database } from '@/database.types';
import PreOutreachPrepWidget from '../widgets/PreOutreachPrepWidget';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

// Strict TypeScript matching your structural JSON priority requirement
interface PrioritizedPerson {
  contact_id: string;
  contact_name: string;
  priority: number;
  justification: string;
  approach_strategy: string;
}

interface Step3Props {
  lead: Lead;
  dbTask: Action;
  contacts: Contact[];
  isSaving: boolean;
  onOpenPrepWidget: () => void;
  onActionUpdated: (action: Action) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step3PreOutreachPrep({
  lead,
  dbTask,
  contacts,
  isSaving,
  onOpenPrepWidget,
  onActionUpdated,
  onCompleteTask
}: Step3Props) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};
  const hasStrategySaved = !!currentMeta.spin_framework;

  // Safely evaluate and parse cached target array lists from action metadata records
  let parsedPeopleList: PrioritizedPerson[] = [];
  try {
    if (currentMeta.people_analysis) {
      if (Array.isArray(currentMeta.people_analysis)) {
        parsedPeopleList = currentMeta.people_analysis;
      } else if (typeof currentMeta.people_analysis === 'object') {
        // Handles cases where it's already an object but nested
        const obj = currentMeta.people_analysis as any;
        parsedPeopleList = obj.prioritized_people || obj;
      } else if (typeof currentMeta.people_analysis === 'string') {
        // 🧼 CLEANUP UTILITY: Strip out code block fences, trailing junk, or raw commentary
        let rawString = currentMeta.people_analysis.trim();

        // Remove leading/trailing markdown code blocks if present
        rawString = rawString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Extract just the inner JSON object boundary if the AI added conversational prefix text
        const jsonBoundaryMatch = rawString.match(/[\{\[]([\s\S]*)[\}\]]/);
        if (jsonBoundaryMatch) {
          rawString = jsonBoundaryMatch[0];
        }

        const parsed = JSON.parse(rawString);
        parsedPeopleList = parsed.prioritized_people || (Array.isArray(parsed) ? parsed : []);
      }
    }
  } catch (e) {
    console.error('Failed to parse cached list logic array context safely:', e);
    // Fallback boundary: Create a clean single entry if the AI returned completely raw unparseable prose
    if (typeof currentMeta.people_analysis === 'string' && currentMeta.people_analysis.trim()) {
      parsedPeopleList = [{
        contact_id: contacts[0]?.id || 'unknown',
        contact_name: contacts[0]?.name || 'Target Lead Contact',
        priority: 1,
        justification: 'Reviewing raw notes...',
        approach_strategy: currentMeta.people_analysis // Displays the raw text gracefully instead of crashing
      }];
    }
  }

  const hasValidAnalysis = parsedPeopleList.length > 0;

  const triggerIrisAnalysis = async () => {
    if (contacts.length === 0) return;

    setIsAiLoading(true);

    try {
      const response = await fetch('/api/iris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: `
            ## SKILL: CONTACT SORTING AND FILTERING
            Your goal is to evaluate a list of people found at a company and organize them by outreach priority.
            * Review job roles closely. Look for owners, founders, managers, or directors handling operations, marketing, branding, or technology.
            * Rank the people in order of who is best to talk to first (#1 Focus, #2 Focus).
            * Provide a direct, plain-English reason why they are ranked there, along with a specific approach strategy tailored to their role.
          `,
          context: {
            company_name: lead.company_name,
            industry: lead.industry,
            people_list: contacts.map(c => ({ id: c.id, name: c.name, role: c.role, notes: c.notes }))
          },
          output_format: {
            prioritized_people: [
              {
                contact_id: "string (id variable matched from the input list)",
                contact_name: "string (full name)",
                priority: "number (1 for top focus, 2 for secondary focus)",
                justification: "string (simple, direct explanation for why they are a key target)",
                approach_strategy: "string (simple advice on what topic or pain point to mention)"
              }
            ]
          }
        }),
      });

      if (!response.ok) throw new Error('AI analysis failed');
      const result = await response.json();

      // Extract array safely from Pattern 2 wrapper layouts
      const finalArray = result.prioritized_people || result;

      const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            people_analysis: finalArray // Saved cleanly as a structured JSON array
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

      {/* Human Actions Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          onClick={onOpenPrepWidget} // Triggers the modal instead of doing nothing
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1.5 flex items-center"
        >
          <FileText className="h-3.5 w-3.5" /> {hasStrategySaved ? 'Edit Review Notes' : 'Do Pre-Outreach Review'}
        </Button>

        {hasStrategySaved && (
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 h-8.5 flex items-center gap-1 rounded-md shadow-sm select-none">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pre-Outreach Notes Saved
          </div>
        )}
      </div>

      {/* Structured Iris Priority List Layout */}
      <div className="space-y-2.5 w-full">
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
            Iris is calculating target priority rankings...
          </div>
        ) : hasValidAnalysis ? (
          /* 🛠️ LIST-RENDERING STRUCTURED JSON STAKEHOLDER MATRIX AS CLEAN FULL-WIDTH CARD SEGMENTS */
          <div className="grid grid-cols-1 gap-3 w-full">
            {parsedPeopleList.map((target, idx) => (
              <div key={target.contact_id || idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-slate-900 space-y-2.5 animate-fadeIn w-full">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[12px] text-slate-900 flex items-center gap-1">{target.contact_name}</span>
                    <span className="text-[11px] font-medium text-slate-400 block">
                      {contacts.find(c => c.id === target.contact_id)?.role || 'Roster Profile Target'}
                    </span>
                  </div>
                  <Badge className={`text-[9px] font-black uppercase px-2 h-5 rounded border-none ${target.priority === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                    Priority #{target.priority}
                  </Badge>
                </div>

                <div className="text-[11px] leading-relaxed text-slate-600 space-y-1.5 pt-0.5">
                  <p className="font-medium"><strong className="text-slate-900 font-bold">Why contact them:</strong> {target.justification}</p>
                  <p className="font-medium bg-slate-50 border border-slate-100 p-2 rounded-md"><strong className="text-slate-900 font-bold flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5 text-slate-500" /> Recommended Strategy:</strong> {target.approach_strategy}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm text-slate-500 text-[11px] text-center space-y-2.5 font-medium">
            <div className="flex items-center justify-center gap-1.5 text-amber-600 font-bold"><AlertTriangle className="h-4 w-4" /> No analysis recorded yet</div>
            <p className="text-slate-400 max-w-sm mx-auto text-[10px]">Click below to prompt Iris to organize your saved contacts.</p>
            <Button type="button" variant="outline" size="sm" onClick={triggerIrisAnalysis} className="h-7 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded px-3">
              Analyze People List
            </Button>
          </div>
        )}
      </div>

      {/* Task Completion Control Banner Row */}
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

    </div>
  );
}