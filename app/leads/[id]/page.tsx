import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import LeadWorkbenchClient from './LeadWorkbenchClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadWorkbenchPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Pull down the target lead file record
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (!lead) {
    notFound();
  }

  // 2. Pull down the related task records from your unified ledger
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  // 3. Pull down your newly updated contact relationship profiles
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  return (
    <LeadWorkbenchClient 
      initialLead={lead} 
      initialActions={actions || []} 
      initialContacts={contacts || []} 
    />
  );
}