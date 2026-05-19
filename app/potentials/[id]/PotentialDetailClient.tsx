'use client';

// app/potentials/[id]/PotentialDetailClient.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2, XCircle, Loader2, Target, Zap, Clock, TrendingUp, ShieldAlert, Lightbulb, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { promotePotential, dismissPotential } from '@/app/actions/potentialActions';

export default function PotentialDetailClient({ potential }: { potential: any }) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const dossier = potential.ai_dossier || {};

  const handlePromote = async () => {
    setActionLoading(true);
    try {
      const { leadId } = await promotePotential(potential.id);
      router.push(`/leads/${leadId}`);
    } catch (err: any) {
      toast.error(err.message || 'Promotion failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    setActionLoading(true);
    try {
      await dismissPotential(potential.id);
      router.push('/potentials');
    } catch (err: any) {
      toast.error(err.message || 'Dismiss failed');
    } finally {
      setActionLoading(false);
    }
  };

  // If dossier is missing (should not happen, but fallback)
  if (Object.keys(dossier).length === 0) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{potential.title || 'Untitled'}</h1>
        <p className="text-muted-foreground">{potential.company_name || 'Unknown company'}</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Fit Score</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{dossier.hotness_score || potential.match_score || 0}%</div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${dossier.hotness_score || 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Est. Sales Cycle</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{dossier.estimated_sales_cycle || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Analysis */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Strategic Analysis</h3>
        </div>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-base">{dossier.strategic_analysis}</p>
          </CardContent>
        </Card>
      </section>

      {/* Triggers & Hurdles */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              Trigger Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{dossier.trigger_alignment}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Strategic Hurdles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{dossier.hurdles}</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Justification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Business Justification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="italic text-base">“{dossier.business_justification}”</p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/95 p-4 rounded-lg border shadow-lg">
        <Button variant="outline" onClick={handleDismiss} disabled={actionLoading} className="flex-1 border-rose-200 text-rose-600">
          <XCircle className="mr-2 h-4 w-4" /> Dismiss
        </Button>
        <Button onClick={handlePromote} disabled={actionLoading} className="flex-1">
          {actionLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Promote to Lead <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}