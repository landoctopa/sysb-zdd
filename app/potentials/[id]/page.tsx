// app/potentials/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import PotentialDetailClient from './PotentialDetailClient';

export default async function PotentialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: potential, error } = await supabase
    .from('user_signals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !potential) notFound();

  return <PotentialDetailClient potential={potential} />;
}