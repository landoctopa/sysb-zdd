// app/potentials/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PotentialsClient from './PotentialsClient';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function PotentialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch all user_signals for this user
  const { data: potentials, error } = await supabase
    .from('user_signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to load potentials');

  return (
    <PageContainer className="py-6">
      <PotentialsClient initialPotentials={potentials || []} />
    </PageContainer>
  );
}