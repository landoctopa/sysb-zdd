'use client';
// components/leads/engaged/Step5ScheduleAppointment.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from '@/database.types';
import { CalendarRange, XOctagon, CheckSquare, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Step5Props {
  lead: Lead;
  dbTask: Action;
  contacts: Contact[];
  isSaving: boolean;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
  onLeadUpdated: React.Dispatch<React.SetStateAction<Lead>>;
}

export default function Step5ScheduleAppointment({
  lead,
  dbTask,
  contacts,
  isSaving,
  onCompleteTask,
  onLeadUpdated
}: Step5Props) {
  const [meetingDate, setMeetingDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentMeta = (dbTask.metadata as Record<string, any>) || {};

  const handleSettleAppointment = async (outcome: 'scheduled' | 'dropped') => {
    if (outcome === 'scheduled' && !meetingDate) {
      toast.error('Please specify the calendar date matching your confirmed scheduled appointment.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Recording conversational verdict metrics...');

    try {
      // 1. Fire complete task pipeline callback
      onCompleteTask(dbTask, {
        appointment_outcome: outcome,
        scheduled_date: outcome === 'scheduled' ? meetingDate : null,
        settled_at: new Date().toISOString()
      });

      // 2. AUTOMATION ROUTING: If scheduled, advance the root lead status to Stage 3 (solution_fit)
      const nextStageStatus = outcome === 'scheduled' ? 'solution_fit' : 'discovery';
      
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStageStatus,
          // Merge scheduled dates safely back into core json properties block
          company_details: {
            ...((lead.company_details as Record<string, any>) || {}),
            confirmed_meeting_date: outcome === 'scheduled' ? meetingDate : null,
            last_engagement_verdict: outcome
          }
        })
      });

      if (!response.ok) throw new Error('Database patch rejected');
      const updatedLead = await response.json();
      
      onLeadUpdated(updatedLead);
      
      if (outcome === 'scheduled') {
        toast.success('Congratulations! Appointment is locked. Moving to Value Fit workspace.', { id: toastId });
      } else {
        toast.info('Lead thread has been dropped and returned to discovery sequences.', { id: toastId });
      }
    } catch (err) {
      toast.error('Could not complete pipeline status update.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (dbTask.status === 'completed' || currentMeta.appointment_outcome) {
    const statusOutcome = currentMeta.appointment_outcome || 'scheduled';
    return (
      <div className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed animate-fadeIn ${
        statusOutcome === 'scheduled' 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}>
        <h4 className="font-bold flex items-center gap-1 text-[12px] pb-1 uppercase select-none">
          <CheckSquare className="h-4 w-4" /> Converstional Outcome Logged Successfully
        </h4>
        <p>
          {statusOutcome === 'scheduled' 
            ? `This thread converted successfully. A formal discovery briefing call is scheduled on your calendar for: ${currentMeta.scheduled_date || 'Confirmed date'}.`
            : 'This conversation tracking path was manually marked as dropped/unresponsive.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs font-sans w-full animate-fadeIn">
      <div className="space-y-2 max-w-md">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5 select-none text-[12px]">
          <CalendarRange className="h-4 w-4 text-slate-500" /> Complete the Conversion Appointment Milestone
        </h4>
        <p className="text-slate-500 font-medium leading-relaxed">
          The Calendar Hold is active. Did they commit to one of your scarcity slots? If so, select the confirmed appointment date to push them forward. If they passed or went cold, you can drop this thread safely.
        </p>
      </div>

      <div className="space-y-1.5 pt-1 max-w-xs">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          Confirmed Appointment Date
        </label>
        <input
          type="date"
          disabled={isProcessing || isSaving}
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 cursor-pointer"
        />
      </div>

      {/* Primary Action Choice Loops split buttons layout */}
      <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100 items-center">
        <Button
          type="button"
          disabled={isProcessing || isSaving || !meetingDate}
          onClick={() => handleSettleAppointment('scheduled')}
          className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700"
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
          Confirm Scheduled Meeting
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={isProcessing || isSaving}
          onClick={() => handleSettleAppointment('dropped')}
          className="h-8.5 text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-4 rounded-md shadow-sm gap-1 flex items-center"
        >
          <XOctagon className="h-3.5 w-3.5" /> Drop Thread / No-Go
        </Button>
      </div>
    </div>
  );
}