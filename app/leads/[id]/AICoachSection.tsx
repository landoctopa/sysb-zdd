'use client';

import { useStore } from '@nanostores/react';
import { $activeLead, $activeCoachLogs, $activeContacts, addTask } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Mail, Calendar, Clipboard, FileText, CheckCircle } from 'lucide-react';
import { buildGmailUrl, buildGoogleCalendarUrl } from '@/lib/url-helpers';
import { toast } from 'sonner';
import { useState } from 'react';

export default function AICoachSection() {
  const lead = useStore($activeLead);
  const logs = useStore($activeCoachLogs);
  const contacts = useStore($activeContacts);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const renderActionButton = () => {
    const actionType = latestLog.action_type;
    const payload = latestLog.action_payload || {};

    switch (actionType) {
      case 'email': {
        const contact = contacts.find(c => c.id === payload.contact_id);
        if (!contact?.email) return <Button disabled>Contact has no email</Button>;
        const gmailUrl = buildGmailUrl(contact.email, payload.subject || '', payload.body || '');
        return (
          <div className="flex gap-2">
            <Button onClick={() => window.open(gmailUrl, '_blank')} className="flex-1 gap-2">
              <Mail className="h-4 w-4" /> Open in Gmail
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(payload.body || '')}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        );
      }
      case 'meeting': {
        const start = new Date(payload.start_datetime);
        const end = new Date(start.getTime() + (payload.duration_minutes || 30) * 60000);
        const calendarUrl = buildGoogleCalendarUrl(
          payload.title || 'Meeting',
          start,
          end,
          payload.agenda || ''
        );
        return (
          <div className="flex gap-2">
            <Button onClick={() => window.open(calendarUrl, '_blank')} className="flex-1 gap-2">
              <Calendar className="h-4 w-4" /> Add to Calendar
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(payload.agenda || '')}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        );
      }
      case 'task': {
        const handleCreateTask = async () => {
          await addTask(lead.id, {
            title: payload.title || 'Task from coach',
            description: payload.description || '',
            due_date: payload.suggested_due_date || new Date().toISOString(),
            status: 'pending',
          });
          toast.success('Task added');
        };
        return <Button onClick={handleCreateTask} className="w-full gap-2"><CheckCircle className="h-4 w-4" /> Create Task</Button>;
      }
      case 'call_script':
        return (
          <div className="space-y-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(payload.script || '')} className="w-full gap-2">
              <Clipboard className="h-4 w-4" /> Copy Script
            </Button>
            <details className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
              <summary className="cursor-pointer font-medium">Preview script</summary>
              <p className="mt-2 whitespace-pre-wrap">{payload.script || 'No script content'}</p>
            </details>
          </div>
        );
      case 'proposal':
        return <Button className="w-full gap-2" disabled><FileText className="h-4 w-4" /> Proposal (coming soon)</Button>;
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