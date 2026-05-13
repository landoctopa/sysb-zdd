'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sparkles,
  Loader2,
  Target,
  Zap,
  Clock,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Brain,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface DossierClientProps {
  signalId: string;
  initialDossier: any;
}

export default function DossierClient({ signalId, initialDossier }: DossierClientProps) {
  const [dossier, setDossier] = useState<any>(initialDossier || null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: 'promote' | 'dismiss') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/signals/action`, {
        method: 'POST',
        body: JSON.stringify({ signalId, action }),
      });
      if (!res.ok) throw new Error('Action failed');

      toast.success(action === 'promote' ? 'Converted to Active Lead' : 'Signal Dismissed');
      window.location.href = '/signals';
    } catch (err) {
      toast.error('Could not process signal action.');
    } finally {
      setActionLoading(false);
    }
  };

  async function generateDossier() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDossier(data);
      toast.success('Strategy analysis complete');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  if (!dossier) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/20 p-8 sm:p-12 text-center space-y-6 bg-gradient-to-br from-primary/[0.02] to-transparent">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Run Strategy Analysis
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Verify alignment with your business profile, estimate deal value, and identify strategic opportunities.
          </p>
        </div>
        <Button
          size="lg"
          onClick={generateDossier}
          disabled={loading}
          className="font-semibold shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Signal...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Strategic Brief
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fit Score
              </p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">
                {dossier.hotness_score}
              </span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full transition-all duration-500"
                style={{ width: `${dossier.hotness_score}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Est. Sales Cycle
              </p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {dossier.estimated_sales_cycle || '3-6 months'}
            </div>
          </CardContent>
        </Card>

        {dossier.confidence_score && (
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Confidence
                </p>
                <Target className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {dossier.confidence_score}%
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Strategic Analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Strategic Analysis
          </h3>
        </div>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-5 sm:p-6">
            <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground/90">
              {dossier.strategic_analysis}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Triggers & Hurdles */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              Trigger Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {dossier.trigger_alignment}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Strategic Hurdles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {dossier.hurdles}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Justification */}
      <Card className="bg-gradient-to-br from-foreground/[0.03] to-transparent border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Business Justification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg sm:text-xl font-medium leading-relaxed italic text-foreground/90">
            “{dossier.business_justification}”
          </p>
        </CardContent>
      </Card>

      {/* Action Bar – inline on desktop, sticky on mobile */}
      <div className="sticky bottom-0 z-30 -mx-4 px-4 py-4 bg-background/95 backdrop-blur-lg border-t md:relative md:bg-transparent md:border-t-0 md:p-0 md:pt-6 md:mx-0 md:px-0 shadow-lg md:shadow-none">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 font-medium"
            onClick={() => handleAction('dismiss')}
            disabled={actionLoading}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Dismiss Signal
          </Button>

          <Button
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            onClick={() => handleAction('promote')}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Promote to Active Lead
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}