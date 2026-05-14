// app/potentials/PotentialsClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar, TrendingUp, Eye, Sparkles, Plus } from 'lucide-react';
import { Database } from '../../database.types';
import ManualSignalModal from '@/components/signals/ManualSignalModal';

type UserSignal = Database['public']['Tables']['user_signals']['Row'];

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'promoted':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'dismissed':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
};

export default function PotentialsClient({ initialPotentials }: { initialPotentials: UserSignal[] }) {
  const router = useRouter();
  const [potentials] = useState(initialPotentials);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  if (potentials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Potentials</h1>
            <p className="text-muted-foreground mt-1">Saved signals with AI strategic analysis.</p>
          </div>
          <Button onClick={() => setIsManualModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Potential
          </Button>
        </div>
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No potentials yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Click on any actionable signal (Company News) in the Market Intelligence page, or add a manual potential.
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={() => router.push('/signals')}>
              Browse Signals
            </Button>
            <Button onClick={() => setIsManualModalOpen(true)}>Add Manual Potential</Button>
          </div>
        </div>
        <ManualSignalModal open={isManualModalOpen} onOpenChange={setIsManualModalOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Potentials</h1>
          <p className="text-muted-foreground mt-1">Saved signals with AI strategic analysis.</p>
        </div>
        <Button onClick={() => setIsManualModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Potential
        </Button>
      </div>

      <div className="space-y-3">
        {potentials.map((potential) => (
          <Card
            key={potential.id}
            className="cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => router.push(`/potentials/${potential.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={`text-[10px] font-semibold ${getStatusBadge(potential.status)}`}>
                      {potential.status || 'new'}
                    </Badge>
                    {potential.ai_dossier && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Sparkles className="h-3 w-3" />
                        Analyzed
                      </Badge>
                    )}
                    {potential.source === 'manual' && (
                      <Badge variant="outline" className="text-[9px] bg-primary/5">
                        Manual
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base">{potential.title || 'Untitled'}</h3>
                  {potential.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{potential.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {potential.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {potential.company_name}
                      </span>
                    )}
                    {potential.match_score && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {potential.match_score}% fit
                      </span>
                    )}
                    {potential.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(potential.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ManualSignalModal open={isManualModalOpen} onOpenChange={setIsManualModalOpen} />
    </div>
  );
}