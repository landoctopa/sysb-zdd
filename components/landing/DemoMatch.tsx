'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  Sparkles,
  Building2,
  Calendar,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { SECTOR_LABELS, EVENT_CATEGORY_LABELS } from '@/utils/constants';
import { COUNTRY_LABELS } from '@/utils/countries';

const getSectorLabel = (s: string) => SECTOR_LABELS[s] || s;
const getEventCategoryLabel = (c: string) => EVENT_CATEGORY_LABELS[c] || c;
const getCountryLabel = (c: string) => COUNTRY_LABELS[c] || c.toUpperCase();

export default function DemoMatch() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    profile: { sectors: string[]; countries: string[]; event_categories: string[] };
    signals: any[];
  } | null>(null);

  const handleSubmit = async () => {
    if (description.trim().length < 10) return;
    setLoading(true);
    try {
      const res = await fetch('/api/demo-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-20 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            See opportunities for your business – right now
          </h2>
          <p className="mt-4 text-muted-foreground">
            Describe your business below and we’ll instantly surface real
            buying signals that match your ideal customer profile.
          </p>
        </div>

        <div className="mt-8 mx-auto max-w-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., I run a creative agency specialising in high‑end video production for automotive and FMCG brands in India and the UAE…"
              className="w-full min-h-[100px] rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || description.trim().length < 10}
              className="h-auto px-6 py-3 font-semibold gap-2 shadow-lg shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? 'Analyzing…' : 'Find Signals'}
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-12 space-y-8">
            {/* Inferred Profile */}
            <div className="flex flex-wrap justify-center gap-3 items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Inferred Profile:
              </span>
              {result.profile.sectors.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5">
                  {getSectorLabel(s)}
                </Badge>
              ))}
              {result.profile.countries.map((c) => (
                <Badge key={c} variant="outline" className="text-[10px] px-2 py-0.5">
                  <Globe className="h-3 w-3 mr-1" />
                  {getCountryLabel(c)}
                </Badge>
              ))}
              {result.profile.event_categories.map((e) => (
                <Badge key={e} variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary">
                  {getEventCategoryLabel(e)}
                </Badge>
              ))}
            </div>

            {/* Signals */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.signals.map((signal) => (
                <Card
                  key={signal.id}
                  className="border-border/60 bg-card/90 backdrop-blur-sm hover:shadow-lg transition-all"
                >
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-2">
                      {signal.title}
                    </h3>
                    {signal.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-2">
                        {signal.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {signal.company_name && (
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {signal.company_name}
                        </span>
                      )}
                      {signal.published_at && (
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(signal.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {result.signals.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                  No matching signals found. Try a broader description.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}