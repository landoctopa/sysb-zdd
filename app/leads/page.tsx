// app/leads/page.tsx
import { createClient } from '@/utils/supabase/server';
import LeadsListHydrator from '@/components/leads/LeadsListHydrator';
import PipelineView from './PipelineView';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function LeadsPage() {
  const supabase = await createClient();

  // FIX: Swapped specific columns for '*' to fetch the full row schema
  // This satisfies the strict LeadRow[] expectations down the line.
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('hotness_score', { ascending: false });

  return (
    <PageContainer className="py-6 md:py-8">
      <LeadsListHydrator leads={leads || []} />
      <PipelineView />
    </PageContainer>
  );
}