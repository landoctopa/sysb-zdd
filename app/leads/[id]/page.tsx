// app/leads/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import LeadWorkbenchClient from './LeadWorkbenchClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Authenticate user context to maintain secure multi-tenant boundaries
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch the root lead file
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (leadError || !lead) {
    notFound();
  }

  // 3. Fetch all timeline entries associated with this deal from our unified ledger
  const { data: actions, error: actionsError } = await supabase
    .from('actions')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  if (actionsError) {
    console.error('[Workbench Fetch Error]: Failed to load ledger:', actionsError.message);
  }

  return (
    <PageContainer className="py-6">
      {/* Hand data off to our interactive workbench client */}
      <LeadWorkbenchClient 
        initialLead={lead} 
        initialActions={actions || []} 
      />
    </PageContainer>
  );
}