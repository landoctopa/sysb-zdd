import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  Globe,
  Building2,
  ArrowLeft,
  ExternalLink,
  BarChart3,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import DossierClient from './DossierClient';
import { EVENT_CATEGORY_LABELS, SECTOR_LABELS } from '@/utils/constants';
import { COUNTRY_LABELS } from '@/utils/countries';
import { PageContainer } from '@/components/layout/PageContainer';

// --- Label helpers (ideally from utils/constants.ts) ---
// You can import these if they're already there:
// import { SECTOR_LABELS, EVENT_CATEGORY_LABELS, getEventCategoryLabel, getSectorLabel } from '@/utils/constants';


const getEventCategoryLabel = (cat: string | null) =>
  cat ? EVENT_CATEGORY_LABELS[cat] || cat : 'Other';

const getSectorLabel = (sector: string) => SECTOR_LABELS[sector] || sector;

const getCountryLabel = (code: string | null) =>
  code ? COUNTRY_LABELS[code] || code.toUpperCase() : 'Not specified';

// -------------------------------------------------------------

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'promoted':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'dismissed':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
};

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch from user_signals (triaged) or raw_signals (firehose)
  let { data: signal } = await supabase
    .from('user_signals')
    .select('*')
    .eq('id', id)
    .single();

  if (!signal) {
    const { data: raw } = await supabase
      .from('raw_signals')
      .select('*')
      .eq('id', id)
      .single();
    signal = raw;
  }

  if (!signal) notFound();

  return (
    <PageContainer className="py-6 md:py-8 lg:py-10">
      {/* Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/signals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Signals
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider opacity-60"
          >
            Ref: {id.slice(0, 8)}
          </Badge>
          <Badge
            className={`uppercase text-[10px] font-semibold px-3 py-1 ${getStatusStyle(
              signal.status || 'new'
            )}`}
          >
            {signal.status || 'New Signal'}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Signal Header */}
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground">
              {signal.title}
            </h1>

            {/* Badges: sectors & event category with human labels */}
            <div className="flex flex-wrap gap-2">
              {signal.sectors?.slice(0, 3).map((s: string) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5"
                >
                  {getSectorLabel(s)}
                </Badge>
              ))}
              {signal.event_category && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5"
                >
                  {getEventCategoryLabel(signal.event_category)}
                </Badge>
              )}
            </div>
          </div>

          {/* Description Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">
                Event Context
              </h2>
            </div>
            <div className="bg-muted/30 rounded-lg p-5 md:p-6">
              <p className="text-sm md:text-base leading-relaxed text-foreground/80">
                {signal.description}
              </p>
            </div>
          </section>

          {/* Dossier Client Component */}
          <DossierClient signalId={id} initialDossier={signal.ai_dossier} />
        </div>

        {/* Sidebar - Metadata Panel */}
        <aside className="lg:col-span-4">
          <div className="sticky top-8 space-y-6">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Company Information
                </h3>
              </div>
              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Entity
                  </p>
                  <p className="font-semibold text-base">
                    {signal.company_name || 'Not specified'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Region
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{getCountryLabel(signal.country)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Published
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {new Date(
                        signal.published_at || signal.created_at
                      ).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {signal.link && (
                  <div className="pt-2">
                    <Button
                      className="w-full h-10 font-medium gap-2"
                      variant="outline"
                      asChild
                    >
                      <a href={signal.link} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        View Original Source
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {signal.ai_dossier && (
              <Card className="border-border/60 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">AI Analysis Ready</p>
                      <p className="text-xs text-muted-foreground">
                        Strategic dossier has been generated for this signal
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}