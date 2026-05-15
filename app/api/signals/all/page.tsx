// app/signals/all/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AllSignalsClient from './AllSignalsClient';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function AllSignalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <PageContainer className="py-6">
      <AllSignalsClient />
    </PageContainer>
  );
}