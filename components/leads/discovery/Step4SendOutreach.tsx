'use client';
// components/leads/discovery/Step4SendOutreach.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { Database } from '@/database.types';

type Action = Database['public']['Tables']['actions']['Row'];

interface Step4Props {
  dbTask: Action;
  isAiLoading: boolean;
  isSaving: boolean;
  generatedDraft: { subject?: string; body?: string; message?: string } | null;
  onTriggerAiAction: (task: Action, channel: 'email' | 'linkedin') => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step4SendOutreach({
  dbTask,
  isAiLoading,
  isSaving,
  generatedDraft,
  onTriggerAiAction,
  onCompleteTask
}: Step4Props) {
  const [channel, setChannel] = useState<'email' | 'linkedin'>('email');

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-3.5 text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900 text-xs">Outreach Assistant</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button type="button" onClick={() => setChannel('email')} className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${channel === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Email</button>
          <button type="button" onClick={() => setChannel('linkedin')} className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${channel === 'linkedin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>LinkedIn</button>
        </div>
      </div>

      {generatedDraft && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md animate-fadeIn text-[11px] leading-relaxed text-slate-600">
          {channel === 'email' ? (
            <>
              <div className="border-b border-slate-200 pb-1.5"><span className="text-[9px] text-slate-400 block font-bold uppercase">Subject Line:</span><span className="font-bold text-slate-900">{generatedDraft.subject}</span></div>
              <div className="whitespace-pre-wrap pt-1">{generatedDraft.body}</div>
            </>
          ) : (
            <div className="whitespace-pre-wrap"><span className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Message:</span>{generatedDraft.message}</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
        <Button type="button" variant="outline" disabled={isAiLoading} onClick={() => onTriggerAiAction(dbTask, channel)} className="h-8.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1">
          {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : channel === 'email' ? <Mail className="h-3.5 w-3.5 text-primary" /> : <LinkedInIcon size={14} />}
          {generatedDraft ? 'Get Another Suggestion' : 'Draft Message with Iris AI'}
        </Button>
        <Button type="button" size="sm" disabled={isSaving} onClick={() => onCompleteTask(dbTask, { message_sent: true, selected_channel: channel })} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm">Confirm Message Has Been Sent</Button>
      </div>
    </div>
  );
}