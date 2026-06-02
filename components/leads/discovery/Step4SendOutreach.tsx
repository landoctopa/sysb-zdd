'use client';
// components/leads/discovery/Step4SendOutreach.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, Copy, Check, User, Sparkles } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
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

export default function Step4SendOutreach({
  lead,
  dbTask,
  actions,
  contacts,
  isSaving,
  onActionUpdated,
  onCompleteTask
}: Step4Props) {
  const [channel, setChannel] = useState<'email' | 'linkedin'>('email');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};

  // Locate Step 3's context parameters
  const prepTask = actions.find(a => (a.metadata as any)?.task_config_id === 'pre_outreach_prep');
  const prepMeta = (prepTask?.metadata as Record<string, any>) || {};
  const spinFramework = prepMeta.spin_framework || null;

  // 💎 Read contact-specific drafts map out of task metadata seamlessly
  const contactDraftsMap = currentMeta.contact_drafts || {};
  const activeContactDrafts = selectedContactId ? contactDraftsMap[selectedContactId] : null;

  const emailDraft = activeContactDrafts?.email || null;
  const linkedinDraft = activeContactDrafts?.linkedin || null;
  const activeDraft = channel === 'email' ? emailDraft : linkedinDraft;

  const currentTargetPerson = contacts.find(c => c.id === selectedContactId) || null;

  const triggerCopywriterGeneration = async () => {
    if (!selectedContactId) {
      toast.error('Please select the contact you want to message first.');
      return;
    }

    setIsAiLoading(true);
    const toastId = toast.loading('Iris is drafting both Email & LinkedIn variations simultaneously...');

    try {
      const leadSignals = (lead.ai_coach_state as any)?.lead_signals || [];
      const latestSignal = leadSignals[0] || null;

      const response = await fetch('/api/iris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: `
            ## SKILL: OUTREACH NOTE COPYWRITING (VIDEO PRODUCTION & BRAND STORYTELLING FOCUS)
            Your goal is to write two distinct, high-converting outreach options (one Email, one LinkedIn message) that start natural business conversations for a premium video production studio.
            
            Follow these parameters explicitly:
            - Email: Under 100 words, brief subject line (4-8 words), short single-sentence paragraphs, ends with a binary low-pressure question.
            - LinkedIn Message: 2-3 sentences max, ultra-conversational, opening hook leverages their background notes/profile data natively, low commitment question.
            - Avoid sales fluff: Never use words like "leverage", "utilize", "synergy", "best-in-class", or "optimize".
          `,
          context: {
            company_name: lead.company_name,
            target_contact: currentTargetPerson ? {
              name: currentTargetPerson.name,
              role: currentTargetPerson.role,
              notes: currentTargetPerson.notes
            } : null,
            original_market_signal: latestSignal ? { title: latestSignal.title, description: latestSignal.description } : null,
            user_checklist_context: spinFramework
          },
          // 💎 Requests both formats at once from the pipeline
          output_format: {
            email: { subject: "Short specific subject line", body: "Personalized message text under 100 words" },
            linkedin: { message: "Brief conversational LinkedIn message text" }
          }
        })
      });

      if (!response.ok) throw new Error('Generation failed');
      const result = await response.json();

      // 💎 Save the data back indexed under the specific contact's ID
      const updatedContactDraftsMap = {
        ...contactDraftsMap,
        [selectedContactId]: {
          email: result.email,
          linkedin: result.linkedin,
          generated_at: new Date().toISOString()
        }
      };

      const updateRes = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            contact_drafts: updatedContactDraftsMap,
            last_active_contact_id: selectedContactId // Fallback reference marker
          }
        })
      });

      if (updateRes.ok) {
        const updatedAction = await updateRes.json();
        onActionUpdated(updatedAction);
        toast.success('Both outreach assets compiled successfully!', { id: toastId });
      }
    } catch (err) {
      console.error('[Multi-Generation Error]:', err);
      toast.error('Could not generate message suggestions.', { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied text suggestion!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs">

      {/* Target Recipient Picker */}
      <div className="space-y-1.5 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none">
          <User className="h-3 w-3 text-slate-400" /> Target Recipient
        </label>
        {contacts.length === 0 ? (
          <div className="text-[11px] text-amber-600 font-medium bg-amber-50/50 border border-amber-200 p-2 rounded">
            Please back up to Step 2 and map at least one contact person first.
          </div>
        ) : (
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs font-semibold p-2 h-9 rounded-md focus:outline-none focus:border-slate-400 text-slate-700 cursor-pointer"
            disabled={isAiLoading || dbTask.status === 'completed'}
          >
            <option value="" disabled>-- Choose who you are messaging --</option>
            {contacts.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} {person.role ? `(${person.role})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Channel Sub-Navigation Toggle Controls */}
      <div className="flex items-center justify-between border-t border-b border-slate-100 py-2">
        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Review Copy Channels</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${channel === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Email View
          </button>
          <button
            type="button"
            onClick={() => setChannel('linkedin')}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-0.5 transition-all ${channel === 'linkedin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            LinkedIn View
          </button>
        </div>
      </div>

      {/* Content Canvas */}
      {activeDraft ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] leading-relaxed text-slate-600 relative group animate-fadeIn">
          <button
            type="button"
            onClick={() => copyToClipboard(channel === 'email' ? activeDraft.body : activeDraft.message)}
            className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>

          {channel === 'email' ? (
            <div className="space-y-2 pr-6">
              <div className="border-b border-slate-200 pb-1.5">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide">Email Subject Line:</span>
                <span className="font-bold text-slate-900">{activeDraft.subject}</span>
              </div>
              <div className="whitespace-pre-wrap pt-1 text-slate-700 font-medium">{activeDraft.body}</div>
            </div>
          ) : (
            <div className="space-y-1 pr-6 text-slate-700 font-medium">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide mb-1">LinkedIn Message Copy:</span>
              <div className="whitespace-pre-wrap">{activeDraft.message}</div>
            </div>
          )}
        </div>
      ) : (
        !isAiLoading && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center text-slate-400 font-medium italic select-none">
            {selectedContactId
              ? "Click below to draft both Email and LinkedIn variations in one go."
              : "Please pick a contact above to unlock automated copywriting generation."}
          </div>
        )
      )}

      {/* Loading Canvas */}
      {isAiLoading && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center gap-2 text-slate-400 font-medium select-none">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
          Iris is engineering both personalized variants simultaneously...
        </div>
      )}

      {/* Interactive Actions Grid Footer Bar */}
      <div className="flex items-center justify-between gap-3 pt-1 text-xs flex-wrap">
        <Button
          type="button"
          variant="outline"
          disabled={isAiLoading || !selectedContactId}
          onClick={triggerCopywriterGeneration}
          className="h-8.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-sm bg-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500 fill-blue-50" />
          {activeDraft ? 'Regenerate Both Options' : 'Generate Both Notes with Iris AI'}
        </Button>

        {dbTask.status !== 'completed' && (
          <Button
            type="button"
            size="sm"
            disabled={isSaving || !activeDraft}
            onClick={() => onCompleteTask(dbTask, {
              message_sent: true,
              sent_via_channel: channel,
              final_recipient_contact_id: selectedContactId
            })}
            className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm ml-auto"
          >
            Mark Selected Message as Sent
          </Button>
        )}

        {dbTask.status === 'completed' && (
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 h-8.5 flex items-center gap-1 rounded-md shadow-sm select-none ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5" /> Step Logged as Completed
          </div>
        )}
      </div>

    </div>
  );
}