import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ZDD Business System',
  description: 'Strategic intelligence platform for solopreneurs and small businesses.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="mx-auto max-w-3xl text-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Strategic Intelligence{' '}
            <span className="text-primary">for Growth</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Identify high‑intent opportunities, generate AI‑powered research dossiers,
            and manage your sales pipeline — all in one platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {user ? (
              <Button size="lg" asChild className="rounded-full px-8 font-semibold">
                <Link href="/leads">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="rounded-full px-8 font-semibold">
                <Link href="/login">Start Free Trial</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}