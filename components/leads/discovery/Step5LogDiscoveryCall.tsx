'use client';
// components/leads/discovery/Step5LogDiscoveryCall.tsx

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from '@/database.types';
import { CheckCircle2, AlertTriangle, RefreshCw, ThumbsUp, ThumbsDown, Users, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@nanostores/react';
import { $isSyncing, refreshActiveActions } from '@/store/leadsStore';

type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactStatus = Database['public']['Enums']['contact_status'];

interface Step5Props {
  lead: Database['public']['Tables']['leads']['Row'];
  dbTask: Action;
  actions: Action[];
  contacts: Contact[];
  isSaving: boolean;
  onActionUpdated: (action: Action) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
  onContactUpdated: (contact: Contact) => void;
  onLeadUpdated?: (updatedLead: Database['public']['Tables']['leads']['Row']) => void;
}

export default function Step5LogDiscoveryCall({ 
  lead,
  dbTask, 
  actions,
  contacts,
  isSaving, 
  onActionUpdated,
  onCompleteTask,
  onContactUpdated,
  onLeadUpdated
}: Step5Props) {
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [responseType, setResponseType] = useState<'positive' | 'negative' | 'unresponsive' | null>(null);
  const [notes, setNotes] = useState('');
  const [isMutationPending, startMutation] = useTransition();
  const globalSyncing = useStore($isSyncing);

  const outreachTask = actions.find(a => (a.metadata as any)?.task_config_id === 'send_first_outreach');

  const handleUpdateContactAndLog = async () => {
    if (!selectedContactId || !responseType) {
      toast.error('Please pick a contact and note down their response.');
      return;
    }

    const toastId = toast.loading('Saving details and advancing pipeline stage...');
    
    const mappedStatus: ContactStatus = responseType === 'positive' 
      ? 'engaged' 
      : responseType === 'negative' 
      ? 'rejected' 
      : 'unresponsive';

    startMutation(async () => {
      try {
        // 1. Update the contact row target
        const contactRes = await fetch(`/api/contacts/${selectedContactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: mappedStatus })
        });

        if (!contactRes.ok) throw new Error('Contact update failed');
        const updatedContact = await contactRes.json();
        onContactUpdated(updatedContact);

        // 2. Clear out step gate restrictions using the global task confirmation handler
        onCompleteTask(dbTask, {
          selected_contact: selectedContactId,
          outcome: responseType,
          challenges_logged: notes.trim()
        });

        // 3. AUTOMATION ENGINE: Mutate lead table root state from 'discovery' to 'engaged' natively
        const leadRes = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'engaged' })
        });

        if (leadRes.ok) {
          const updatedLead = await leadRes.json();
          if (onLeadUpdated) {
            onLeadUpdated(updatedLead);
          }
        }

        toast.success('Awesome! Discovery is complete and you are officially in the Engaged stage.', { id: toastId });
      } catch (err) {
        console.error('[Step 5 Logging Exception]:', err);
        toast.error('Could not advance pipeline state automatically.', { id: toastId });
      }
    });
  };

  const handleResetOutreachSequence = async () => {
    if (!outreachTask) return;

    const toastId = toast.loading('Resetting step timeline for backup contact retry...');
    
    startMutation(async () => {
      try {
        const resetRes = await fetch(`/api/actions/${outreachTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'pending',
            completed_at: null,
            metadata: {
              ...(outreachTask.metadata as Record<string, any> || {}),
              message_sent: false
            }
          })
        });

        if (!resetRes.ok) throw new Error('Reset request rejected');
        const updatedOutreach = await resetRes.json();
        onActionUpdated(updatedOutreach);

        if (selectedContactId && responseType) {
          const targetStatus: ContactStatus = responseType === 'negative' ? 'rejected' : 'unresponsive';
          const contactRes = await fetch(`/api/contacts/${selectedContactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
          });
          if (contactRes.ok) {
            const updatedContact = await contactRes.json();
            onContactUpdated(updatedContact);
          }
        }

        await refreshActiveActions(lead.id);
        toast.success('Step 4 is open again! Select a backup contact and retry.', { id: toastId });
      } catch (err) {
        toast.error('Could not open step back up.');
      }
    });
  };

  const hasAnEngagedContact = contacts.some(c => c.status === 'engaged');
  if (dbTask.status === 'completed' || hasAnEngagedContact) {
    const activeContact = contacts.find(c => c.status === 'engaged') || contacts.find(c => c.id === (dbTask.metadata as any)?.selected_contact);
    
    return (
      <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-2 border-emerald-600 rounded-xl text-xs space-y-4 animate-fadeIn shadow-sm">
        <div className="flex items-center gap-2 text-emerald-800">
          <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-sm">
            <Sparkles className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight text-emerald-950">Boom! First Breakthrough Locked In! 🎉</h3>
            <p className="text-[11px] text-emerald-700/90 font-medium mt-0.5">You broke through the noise with **{activeContact?.name || lead.company_name}**.</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-emerald-200 p-3.5 rounded-lg text-slate-700 font-medium space-y-2 leading-relaxed shadow-sm">
          <p className="text-slate-900 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600" /> What happens in the next stage?
          </p>
          <p>
            Now that you have an open line of communication, you are moving into the **Engaged stage**. 
            Instead of just introducing yourself, your next mission is to map out other key decision-makers 
            in the company and turn this initial interest into a formal stakeholder alignment chat.
          </p>
          <p className="text-emerald-800 font-bold italic pt-1">
            "Huge milestone. Getting a funded brand to pause and reply is a massive win. Take a breath, refresh your canvas, and let's go build this champion loop!" — Iris AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs">
      
      {/* Target Selector */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-900 flex items-center gap-1.5 select-none">
          <Users className="h-3.5 w-3.5 text-slate-500" /> 1. Who answered your message?
        </label>
        <select
          value={selectedContactId}
          onChange={(e) => setSelectedContactId(e.target.value)}
          className="w-full bg-slate-50/50 border border-slate-200 text-xs px-2.5 h-9 rounded-md focus:outline-none focus:border-slate-400 text-slate-900 font-medium transition-colors cursor-pointer"
        >
          <option value="">-- Choose a contact profile --</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.role ? `(${c.role})` : ''} — [{c.status || 'identified'}]
            </option>
          ))}
        </select>
      </div>

      {/* Binary Outcome Buttons */}
      <div className="space-y-2">
        <span className="font-bold text-slate-900 block select-none">2. Did they respond positively?</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setResponseType('positive')}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 font-bold ${
              responseType === 'positive'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-inner'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${responseType === 'positive' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <span className="block text-[11px]">Yes, interested</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType('negative')}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 font-bold ${
              responseType === 'negative'
                ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-inner'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <ThumbsDown className={`h-4 w-4 ${responseType === 'negative' ? 'text-amber-600' : 'text-slate-400'}`} />
            <div>
              <span className="block text-[11px]">No / Passed</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setResponseType('unresponsive')}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 font-bold ${
              responseType === 'unresponsive'
                ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-inner'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <AlertTriangle className={`h-4 w-4 ${responseType === 'unresponsive' ? 'text-slate-600' : 'text-slate-400'}`} />
            <div>
              <span className="block text-[11px]">Ghosted / No Reply</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dynamic Context Fields Container */}
      {responseType === 'positive' && (
        <div className="space-y-1.5 animate-fadeIn">
          <span className="font-bold text-slate-900 block select-none">3. What problems can you help them solve?</span>
          <textarea
            rows={3}
            placeholder="Note down their main challenges or what they are looking for help with..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 text-xs p-2.5 rounded-md focus:outline-none focus:border-slate-400 text-slate-900 font-medium transition-colors resize-none"
          />
        </div>
      )}

      {/* Operational Back-routing Controls */}
      {(responseType === 'negative' || responseType === 'unresponsive') && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-md space-y-2.5 animate-fadeIn">
          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
            💡 <strong>Outreach Reset available:</strong> Since this contact did not land a live chat hook, we recommend targeting one of the backup people you mapped out during Step 2.
          </p>
          <Button
            type="button"
            disabled={isMutationPending || globalSyncing || !selectedContactId}
            onClick={handleResetOutreachSequence}
            className="h-8 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1 px-3.5 shadow-sm"
          >
            <RefreshCw className={`h-3 w-3 ${isMutationPending ? 'animate-spin' : ''}`} /> Target a Backup Contact
          </Button>
        </div>
      )}

      {/* Confirmation Actions Footer */}
      {responseType === 'positive' && (
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            size="sm"
            disabled={!selectedContactId || !notes.trim() || isSaving || isMutationPending}
            onClick={handleUpdateContactAndLog}
            className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm"
          >
            Save Details & Close Discovery
          </Button>
        </div>
      )}
    </div>
  );
}