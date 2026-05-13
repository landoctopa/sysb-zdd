import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SignalsClient from './SignalsClient';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function SignalsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch profile if needed for user name/settings (still optional)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <PageContainer className="py-6">
      <SignalsClient profile={profile} />
    </PageContainer>
  );
}