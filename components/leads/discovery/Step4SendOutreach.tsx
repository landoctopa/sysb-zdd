'use client';
// components/leads/discovery/Step4SendOutreach.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, Copy, Check } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];

interface Step4Props {
  lead: Lead;
  dbTask: Action;
  actions: Action[];
  isSaving: boolean;
  onActionUpdated: (action: Action) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step4SendOutreach({
  lead,
  dbTask,
  actions,
  isSaving,
  onActionUpdated,
  onCompleteTask
}: Step4Props) {
  const [channel, setChannel] = useState<'email' | 'linkedin'>('email');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};
  
  // Locates Step 3's task dataset dynamically to harvest cross-step context parameters
  const prepTask = actions.find(a => (a.metadata as any)?.task_config_id === 'pre_outreach_prep');
  const prepMeta = (prepTask?.metadata as Record<string, any>) || {};
  
  const spinFramework = prepMeta.spin_framework || null;
  const peopleAnalysis = prepMeta.people_analysis || null;

  // Resolves the active copy suggestions from local metadata tracking
  const emailDraft = currentMeta.email_draft || null;
  const linkedinDraft = currentMeta.linkedin_draft || null;
  const activeDraft = channel === 'email' ? emailDraft : linkedinDraft;

  const triggerCopywriterGeneration = async () => {
    setIsAiLoading(true);
    const toastId = toast.loading(`Drafting your custom ${channel} outreach...`);

    try {
      // Pull down original signal records safely from the frozen lead слушание array matrix
      const leadSignals = (lead.ai_coach_state as any)?.lead_signals || [];
      const latestSignal = leadSignals[0] || null;

      const response = await fetch('/api/iris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: `
            ## SKILL: OUTREACH NOTE COPYWRITING
            Your goal is to write a warm, brief message that starts a normal business conversation.
            Follow these parameters explicitly:
            - Email: Under 100 words, highly personalized, short subject line (4-8 words), prospect-centric, ends with a binary low-pressure question.
            - LinkedIn Message: Short connection message follow-up sequence style, direct observation, brief point, low commitment question.
            - Do not use corporate fluff words like "leverage", "utilize", "synergy", or "industry-leading".
          `,
          context: {
            channel_mode: channel,
            company_name: lead.company_name,
            original_market_signal: latestSignal ? { title: latestSignal.title, description: latestSignal.description } : null,
            user_review_notes: spinFramework, // Context harvested from user review inputs
            target_priorities: peopleAnalysis // Context harvested from Iris prioritization matrix
          },
          output_format: channel === 'email' 
            ? { subject: "Short, specific subject line (4-8 words)", body: "Full personalized email text under 100 words" }
            : { message: "Brief conversational LinkedIn text line" }
        })
      });

      if (!response.ok) throw new Error('Generation failed');
      const result = await response.json();

      // Persist the generated content straight into the task's action row matrix metadata
      const updatePayload = channel === 'email' 
        ? { ...currentMeta, email_draft: result }
        : { ...currentMeta, linkedin_draft: result };

      const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: updatePayload })
      });

      if (updateRes.ok) {
        const updatedAction = await updateRes.json();
        onActionUpdated(updatedAction);
        toast.success('Outreach suggestion compiled!', { id: toastId });
      }
    } catch (err) {
      console.error('[Step 4 Generation Error]:', err);
      toast.error('Could not generate message copy lines.', { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Outreach text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs">
      
      {/* Channel Header Navigation Toggle Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900 text-xs">Outreach Assistant</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button 
            type="button" 
            onClick={() => setChannel('email')} 
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${channel === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Email
          </button>
          <button 
            type="button" 
            onClick={() => setChannel('linkedin')} 
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-0.5 transition-all ${channel === 'linkedin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Structured Template Content Card Presenter Block */}
      {activeDraft ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] leading-relaxed text-slate-600 relative group animate-fadeIn">
          <button
            type="button"
            onClick={() => copyToClipboard(channel === 'email' ? activeDraft.body : activeDraft.message)}
            className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
            title="Copy copy text to clipboard"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>

          {channel === 'email' ? (
            <div className="space-y-2 pr-6">
              <div className="border-b border-slate-200 pb-1.5">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide">Subject Line:</span>
                <span className="font-bold text-slate-900">{activeDraft.subject}</span>
              </div>
              <div className="whitespace-pre-wrap pt-1 text-slate-700 font-medium">{activeDraft.body}</div>
            </div>
          ) : (
            <div className="space-y-1 pr-6 text-slate-700 font-medium">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide mb-1">LinkedIn Message Strategy:</span>
              <div className="whitespace-pre-wrap">{activeDraft.message}</div>
            </div>
          )}
        </div>
      ) : (
        !isAiLoading && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center text-slate-400 font-medium italic">
            Click below to parse your Pre-Outreach Review notes and generate a custom message suggestion.
          </div>
        )
      )}

      {/* Loading state placeholders */}
      {isAiLoading && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center gap-2 text-slate-400 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          Iris is applying copywriting frameworks to craft your note...
        </div>
      )}

      {/* Bottom Interactive Decision Elements */}
      <div className="flex items-center justify-between gap-3 pt-1 text-xs flex-wrap">
        <Button 
          type="button" 
          variant="outline" 
          disabled={isAiLoading || !spinFramework} 
          onClick={triggerCopywriterGeneration} 
          className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-sm"
        >
          {channel === 'email' ? <Mail className="h-3.5 w-3.5 text-slate-500" /> : <LinkedInIcon size={14} />}
          {activeDraft ? 'Get Another Suggestion' : 'Draft Message with Iris AI'}
        </Button>

        {dbTask.status !== 'completed' && (
          <Button 
            type="button" 
            size="sm" 
            disabled={isSaving || !activeDraft} 
            onClick={() => onCompleteTask(dbTask, { message_sent: true, selected_channel: channel })} 
            className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm ml-auto"
          >
            Confirm Message Has Been Sent
          </Button>
        )}

        {dbTask.status === 'completed' && (
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 h-8.5 flex items-center gap-1 rounded-md shadow-sm select-none ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5" /> Message Dispatched via {currentMeta.selected_channel || 'System'}
          </div>
        )}
      </div>

    </div>
  );
}