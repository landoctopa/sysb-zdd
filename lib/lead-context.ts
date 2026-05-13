import { createClient } from '@/utils/supabase/server';
import { Database } from '../database.types';

type LeadContext = {
  lead: any;
  communications: {
    total: number;
    by_type: Record<string, number>;
    recent: { type: string; subject: string; date: string }[];
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    next_due_date: string | null;
  };
  contacts: {
    total: number;
    with_email: number;
    list: { id: string; name: string; title: string | null; email: string | null }[];
  };
  recent_activity: any[];
};

export async function getLeadContext(leadId: string): Promise<LeadContext> {
  const supabase = await createClient();

  const [leadRes, commsRes, tasksRes, contactsRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single(),
    supabase.from('communications').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('lead_id', leadId),
    supabase.from('contacts').select('*').eq('lead_id', leadId),
  ]);

  const lead = leadRes.data;
  const comms = commsRes.data || [];
  const tasks = tasksRes.data || [];
  const contacts = contactsRes.data || [];

  const commsByType: Record<string, number> = {};
  for (const c of comms) {
    commsByType[c.type] = (commsByType[c.type] || 0) + 1;
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const nextDue = pendingTasks.length
    ? pendingTasks.sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0].due_date
    : null;

  const recentActivity = [
    ...comms.slice(0, 3).map(c => ({ type: 'comm', ...c })),
    ...tasks.slice(0, 3).map(t => ({ type: 'task', ...t })),
  ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,5);

  return {
    lead: {
      company_name: lead.company_name,
      country: lead.country,
      event_category: lead.event_category,
      status: lead.status,
      hotness_score: lead.hotness_score,
      deal_timeline: lead.deal_timeline,
      strategic_analysis: lead.strategic_analysis,
      trigger_alignment: lead.trigger_alignment,
      strategic_hurdles: lead.strategic_hurdles,
      business_justification: lead.business_justification,
      proposal_generated: lead.proposal_generated,
    },
    communications: {
      total: comms.length,
      by_type: commsByType,
      recent: comms.slice(0, 3).map(c => ({ type: c.type, subject: c.subject || '', date: c.created_at })),
    },
    tasks: {
      total: tasks.length,
      completed: completedTasks,
      pending: pendingTasks.length,
      next_due_date: nextDue,
    },
    contacts: {
      total: contacts.length,
      with_email: contacts.filter(c => c.email).length,
      list: contacts.map(c => ({ id: c.id, name: c.name, title: c.title, email: c.email })),
    },
    recent_activity: recentActivity,
  };
}