'use client';
// components/leads/engaged/Step4GenerateReply.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Copy, Check, CheckCircle2, MessageSquare, Video, MapPin } from 'lucide-react';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Step4Props {
  lead: Lead;
  dbTask: Action;
  actions: Action[];
  contacts: Contact[];
  isSaving: boolean;
  onActionUpdated: (action: Action) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step4GenerateReply({
  lead,
  dbTask,
  actions,
  contacts,
  isSaving,
  onActionUpdated,
  onCompleteTask
}: Step4Props) {
  const [strategyChannel, setStrategyChannel] = useState<'text' | 'loom' | 'physical'>('text');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};
  const activePlaybooks = currentMeta.active_response_playbooks || null;
  const currentTextCopy = activePlaybooks?.[strategyChannel] || null;

  // Retrieve previous research/categories dynamically
  const step2Task = actions.find(a => (a.metadata as any)?.task_config_id === 'categorize_buyer_response');
  const step3Task = actions.find(a => (a.metadata as any)?.task_config_id === 'stakeholder_deep_research');
  
  const flavorCategory = (step2Task?.metadata as any)?.response_category || 'curious_question';
  const researchGrounds = (step3Task?.metadata as any)?.researched_hooks || 'No shared common grounds tracked yet.';

  const handleGeneratePlaybookScript = async () => {
    setIsAiLoading(true);
    const toastId = toast.loading('Iris is configuring your tactical 3-Part framework variations...');

    try {
      const response = await fetch('/api/iris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: `
            ## SKILL: B2B OUTREACH RESPONSE SCRIPTWRITING
            Your goal is to engineer a perfect 3-part response reply (Acknowledge + Bridge + Low-Friction Ask) that moves a business prospect from an initial reply to a scheduled call.
            
            Follow this framework explicitly:
            - Part A (Acknowledge): Validate their response and time naturally.
            - Part B (Bridge): Avoid dumping deep data cards, prices, or files. Deflect deep data loops into a conversation hold.
            - Part C (Low-Friction Ask): Propose an immediate appointment with absolute calendar scarcity (e.g. Tuesday at 2pm or Wednesday at 11am).
            
            Context Parameters:
            - Category Track Selected: ${flavorCategory}
            - Found Common Grounds: ${researchGrounds}
          `,
          context: {
            company_name: lead.company_name,
            website: lead.website
          },
          output_format: {
            text: "Full text email/message variant matching your 3-part rules completely.",
            loom: "A brief 4-sentence verbal screen-recording voiceover script tailored to highlight their profile or site hooks.",
            physical: "A conversion script tailored to propose dropping by local corporate centers for a brief 10-minute coffee meeting."
          }
        })
      });

      if (!response.ok) throw new Error('Generation failed');
      const result = await response.json();

      const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            active_response_playbooks: result,
            generated_at: new Date().toISOString()
          }
        })
      });

      if (updateRes.ok) {
        const updatedAction = await updateRes.json();
        onActionUpdated(updatedAction);
        toast.success('Your consultative strategy response scripts are prepared!', { id: toastId });
      }
    } catch (err) {
      console.error('[Playbook Copy Generation Error]:', err);
      toast.error('Could not generate script strategies.', { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied strategy to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs w-full animate-fadeIn font-sans">
      
      {/* Sub-channel Selection tabs bar layout */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none">Engagement Channels</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setStrategyChannel('text')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${strategyChannel === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <MessageSquare className="h-3 w-3" /> Text Copy
          </button>
          <button
            type="button"
            onClick={() => setStrategyChannel('loom')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${strategyChannel === 'loom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Video className="h-3 w-3" /> Video Script
          </button>
          <button
            type="button"
            onClick={() => setStrategyChannel('physical')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${strategyChannel === 'physical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <MapPin className="h-3 w-3" /> Physical Meet
          </button>
        </div>
      </div>

      {currentTextCopy ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] leading-relaxed text-slate-700 font-medium relative group animate-fadeIn whitespace-pre-wrap">
          <button
            type="button"
            onClick={() => copyToClipboard(currentTextCopy)}
            className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>
          <div className="pt-1 pr-6 font-mono text-slate-800">{currentTextCopy}</div>
        </div>
      ) : (
        !isAiLoading && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center text-slate-400 font-medium italic select-none">
            Click below to generate specialized, consultative B2B frameworks tailored to this buyer's response behavior.
          </div>
        )
      )}

      {isAiLoading && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center gap-2 text-slate-400 font-medium select-none animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          Iris is aligning common grounds with your specific response plays...
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1 text-xs">
        <Button
          type="button"
          variant="outline"
          disabled={isAiLoading || isSaving}
          onClick={handleGeneratePlaybookScript}
          className="h-8.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-sm bg-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          {currentTextCopy ? 'Regenerate Framework Choices' : 'Compile Response Framework Option'}
        </Button>

        {dbTask.status !== 'completed' && (
          <Button
            type="button"
            size="sm"
            disabled={isSaving || !currentTextCopy || isAiLoading}
            onClick={() => onCompleteTask(dbTask, { reply_message_dispatched: true, channel_used: strategyChannel })}
            className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm ml-auto"
          >
            Mark Message as Sent
          </Button>
        )}

        {dbTask.status === 'completed' && (
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 h-8.5 flex items-center gap-1 rounded-md shadow-sm select-none ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5" /> Dispatched & Logged to Feed
          </div>
        )}
      </div>

    </div>
  );
}