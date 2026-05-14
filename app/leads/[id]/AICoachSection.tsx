'use client';

import { useStore } from '@nanostores/react';
import { $activeLead, $activeCoachLogs, $activeContacts, addTask } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, RefreshCw, Mail, Calendar, Clipboard, FileText, CheckCircle } from 'lucide-react';
import { buildGmailUrl, buildGoogleCalendarUrl } from '@/lib/url-helpers';
import { toast } from 'sonner';
import { useState } from 'react';
import type { CoachLogRow, ContactRow, LeadRow } from '@/store/leadsStore'; // import types

// Define the shape of action payloads for each type
type EmailPayload = { contact_id?: string; subject: string; body: string };
type MeetingPayload = { title: string; start_datetime: string; duration_minutes?: number; agenda?: string };
type TaskPayload = { title: string; description?: string; suggested_due_date?: string };
type CallScriptPayload = { script: string; objective?: string };
type ProposalPayload = { key_points: string[]; roi_estimate?: string };
type QuestionPayload = { question: string; field: string };

type ActionPayload = 
  | EmailPayload 
  | MeetingPayload 
  | TaskPayload 
  | CallScriptPayload 
  | ProposalPayload 
  | QuestionPayload 
  | Record<string, never>;

export default function AICoachSection() {
  const lead = useStore($activeLead);
  const logs = useStore($activeCoachLogs);
  const contacts = useStore($activeContacts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const latestLog = logs?.[0];
  if (!latestLog || !lead) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/coach`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const newLog = await res.json();
      $activeCoachLogs.set([newLog, ...logs]);
      toast.success('Coach updated with new insight');
    } catch (err) {
      toast.error('Failed to refresh coach');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmitAnswer = async (field: string, question: string) => {
    if (!answerValue.trim()) {
      toast.error('Please provide an answer');
      return;
    }
    setIsSubmittingAnswer(true);
    try {
      // Store answer in lead metadata
      const res = await fetch(`/api/leads/${lead.id}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { [field]: answerValue.trim() } }),
      });
      if (!res.ok) throw new Error();
      toast.success('Answer saved');
      // Refresh coach to get next action
      const refreshRes = await fetch(`/api/leads/${lead.id}/coach`, { method: 'POST' });
      if (refreshRes.ok) {
        const newLog = await refreshRes.json();
        $activeCoachLogs.set([newLog, ...logs]);
      }
      setAnswerValue('');
    } catch (err) {
      toast.error('Failed to save answer');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const renderActionButton = () => {
    const actionType = latestLog.action_type;
    const payload = latestLog.action_payload as ActionPayload;

    switch (actionType) {
      case 'email': {
        const emailPayload = payload as EmailPayload;
        const contact = contacts.find(c => c.id === emailPayload.contact_id);
        if (!contact?.email) return <Button disabled>Contact has no email</Button>;
        const gmailUrl = buildGmailUrl(contact.email, emailPayload.subject || '', emailPayload.body || '');
        return (
          <div className="flex gap-2">
            <Button onClick={() => window.open(gmailUrl, '_blank')} className="flex-1 gap-2">
              <Mail className="h-4 w-4" /> Open in Gmail
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(emailPayload.body || '')}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        );
      }
      case 'meeting': {
        const meetingPayload = payload as MeetingPayload;
        const start = new Date(meetingPayload.start_datetime);
        const end = new Date(start.getTime() + (meetingPayload.duration_minutes || 30) * 60000);
        const calendarUrl = buildGoogleCalendarUrl(
          meetingPayload.title || 'Meeting',
          start,
          end,
          meetingPayload.agenda || ''
        );
        return (
          <div className="flex gap-2">
            <Button onClick={() => window.open(calendarUrl, '_blank')} className="flex-1 gap-2">
              <Calendar className="h-4 w-4" /> Add to Calendar
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(meetingPayload.agenda || '')}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        );
      }
      case 'task': {
        const taskPayload = payload as TaskPayload;
        const handleCreateTask = async () => {
          await addTask(lead.id, {
            title: taskPayload.title || 'Task from coach',
            description: taskPayload.description || '',
            due_date: taskPayload.suggested_due_date || new Date().toISOString(),
            status: 'pending',
          });
          toast.success('Task added');
        };
        return <Button onClick={handleCreateTask} className="w-full gap-2"><CheckCircle className="h-4 w-4" /> Create Task</Button>;
      }
      case 'call_script': {
        const scriptPayload = payload as CallScriptPayload;
        return (
          <div className="space-y-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(scriptPayload.script || '')} className="w-full gap-2">
              <Clipboard className="h-4 w-4" /> Copy Script
            </Button>
            <details className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
              <summary className="cursor-pointer font-medium">Preview script</summary>
              <p className="mt-2 whitespace-pre-wrap">{scriptPayload.script || 'No script content'}</p>
            </details>
          </div>
        );
      }
      case 'proposal': {
        const proposalPayload = payload as ProposalPayload;
        return (
          <div className="space-y-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(proposalPayload.key_points, null, 2))} className="w-full gap-2">
              <Clipboard className="h-4 w-4" /> Copy Talking Points
            </Button>
            <details className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
              <summary className="cursor-pointer font-medium">Proposal outline</summary>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                {proposalPayload.key_points?.map((point, i) => <li key={i}>{point}</li>)}
              </ul>
              {proposalPayload.roi_estimate && <p className="mt-2 text-primary text-xs">ROI estimate: {proposalPayload.roi_estimate}</p>}
            </details>
          </div>
        );
      }
      case 'question': {
        const questionPayload = payload as QuestionPayload;
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{questionPayload.question}</p>
            <div className="flex gap-2">
              <Input
                placeholder="Your answer..."
                value={answerValue}
                onChange={(e) => setAnswerValue(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleSubmitAnswer(questionPayload.field, questionPayload.question)}
                disabled={isSubmittingAnswer}
              >
                {isSubmittingAnswer ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Sales Coach</h3>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Beta</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
              Next Best Action
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{latestLog.insight}</p>
          </div>
          {renderActionButton()}
        </CardContent>
      </Card>
    </section>
  );
}