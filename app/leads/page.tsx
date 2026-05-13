// app/leads/page.tsx
import { createClient } from '@/utils/supabase/server';
import LeadStoreHydrator from '@/components/leads/LeadStoreHydrator';
import PipelineView from './PipelineView';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, status, hotness_score, deal_timeline, lead_category, created_at')
    .order('hotness_score', { ascending: false });

  return (
    <PageContainer className="py-6 md:py-8">
      <LeadStoreHydrator leads={leads || []} />
      <PipelineView />
    </PageContainer>
  );
}