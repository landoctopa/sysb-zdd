// app/leads/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import LeadStoreHydrator from '@/components/leads/LeadStoreHydrator';
import WorkbenchHeader from './WorkbenchHeader';
import IrisCoachSection from '@/components/iris/IrisCoachSection';
import StrategyCard from './StrategyCard';
import ActivityFeed from './ActivityFeed';
import ContactsManager from './ContactsManager';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function LeadWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  if (!lead) notFound();

  // Fetch all related data
  const [contacts, tasks, communications, coachLogs, profile] = await Promise.all([
    supabase.from('contacts').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('lead_id', id).order('due_date', { ascending: true }),
    supabase.from('communications').select('*').eq('lead_id', id).order('occurred_at', { ascending: false }),
    supabase.from('ai_coach_logs').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', lead.user_id).single(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LeadStoreHydrator
        activeLead={lead}
        contacts={contacts.data || []}
        tasks={tasks.data || []}
        coachLogs={coachLogs.data || []}
        communications={communications.data || []}
        userProfile={profile.data || undefined}
      />

      {/* Sticky header – unchanged */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <PageContainer className="py-0">
          <div className="flex items-center justify-between h-14">
            <Link href="/leads">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Pipeline</span>
              </Button>
            </Link>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lead Workbench</p>
              <h1 className="font-semibold text-sm truncate max-w-[150px] sm:max-w-md">{lead.company_name}</h1>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <MoreVertical className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </Button>
          </div>
        </PageContainer>
      </div>

      <main className="flex-1 py-6">
        <PageContainer className="space-y-8 pb-20 md:pb-8">
          <WorkbenchHeader />
          <IrisCoachSection />
          <StrategyCard />
          <ContactsManager />
          <ActivityFeed />
        </PageContainer>
      </main>
    </div>
  );
}