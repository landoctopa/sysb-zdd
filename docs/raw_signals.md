# Matching Right Signals

## Context
I am developing a sales applications for small business and solopreneurs. It has following components.

1. a hono app running on cloudflare worker with cron which fetch news from rss feeds and api globally and for user added sources. this data get categorized by deepseek api and stored in raw_signals table in supabase.
2. The main app built in nextjs reads from raw_signal and matches rows from raw_signals and render it to inbox in /signals route based on following fields in profiles table for the a user. 
    - target_countries: string[] | null
    - target_event_categories: string[] | null
    - target_sectors: string[] | null
3. users add leads from signal and app takes them through the conversion process

## Task
I am not very happy with the matching query for populating signals for a user inbox from raw_signals. can you look at my code to find the problem and recommend solutions.
- ask me for any clarification or code. 

## Role
You are a expert full stack developer with years of professional experience in postgresql, supabase and nextjs.

## Details attached
- Supabase - database.type.ts for table schema
- api endpoint
- front end code for /siganls - PipelineViewer.tsx component

### database schema
```ts
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      feed_sources: {
        Row: {
          api_config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          type: string | null
          url: string
          user_id: string
        }
        Insert: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          type?: string | null
          url: string
          user_id?: string
        }
        Update: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          type?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          description: string | null
          full_name: string | null
          id: string
          ideal_customer_profile: Json | null
          is_premium: boolean | null
          lead_quota_monthly: number | null
          offerings: Json | null
          past_projects: Json | null
          sync_frequency_hours: number | null
          target_countries: string[] | null
          target_event_categories: string[] | null
          target_sectors: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          description?: string | null
          full_name?: string | null
          id: string
          ideal_customer_profile?: Json | null
          is_premium?: boolean | null
          lead_quota_monthly?: number | null
          offerings?: Json | null
          past_projects?: Json | null
          sync_frequency_hours?: number | null
          target_countries?: string[] | null
          target_event_categories?: string[] | null
          target_sectors?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          ideal_customer_profile?: Json | null
          is_premium?: boolean | null
          lead_quota_monthly?: number | null
          offerings?: Json | null
          past_projects?: Json | null
          sync_frequency_hours?: number | null
          target_countries?: string[] | null
          target_event_categories?: string[] | null
          target_sectors?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      raw_signals: {
        Row: {
          company_name: string | null
          country: string | null
          created_at: string | null
          description: string | null
          event_category: string | null
          feed_id: string | null
          fingerprint: string | null
          id: string
          link: string | null
          metadata: Json | null
          published_at: string | null
          sectors: string[] | null
          signal_type: Database["public"]["Enums"]["signal_category"] | null
          status: string | null
          title: string | null
        }
        Insert: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          event_category?: string | null
          feed_id?: string | null
          fingerprint?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          published_at?: string | null
          sectors?: string[] | null
          signal_type?: Database["public"]["Enums"]["signal_category"] | null
          status?: string | null
          title?: string | null
        }
        Update: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          event_category?: string | null
          feed_id?: string | null
          fingerprint?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          published_at?: string | null
          sectors?: string[] | null
          signal_type?: Database["public"]["Enums"]["signal_category"] | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_signals_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feed_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_raw_signals: { Args: never; Returns: undefined }
    }
    Enums: {
      signal_category:
        | "Company News"
        | "Industry Trend"
        | "Events/Meetups"
        | "Regulatory/Government"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

```

### Endpoint
app/api/signals/action/route.ts

```ts
// app/api/signals/action/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { signalId, action } = await req.json();

  // 1. Auth & Identity
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 2. Fetch the Signal and its AI research (the dossier)
    const { data: signal, error: signalError } = await supabase
      .from('user_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (action === 'promote') {
      const dossier = signal.ai_dossier || {};

      // STEP A: Create the "Leads Workbench" Record
      // We map the Strategic Analyst's research directly into the lead workspace
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          user_signal_id: signal.id,
          signal_id: signal.raw_signal_id,
          company_name: signal.company_name,
          title: signal.title,
          country: signal.country,
          lead_category: signal.event_category,
          hotness_score: dossier.hotness_score || signal.match_score,
          
          // Strategic mapping from the research we finalized in Step 2
          strategic_analysis: dossier.strategic_analysis,
          trigger_alignment: dossier.trigger_alignment,
          strategic_hurdles: dossier.hurdles,
          business_justification: dossier.business_justification,
          deal_timeline: dossier.estimated_sales_cycle,
          
          status: 'new'
        })
        .select()
        .single();

      if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

      // STEP B: Initialize the AI Coach history
      // We start the audit trail for coaching here
      await supabase.from('ai_coach_logs').insert({
        lead_id: lead.id,
        stage: 'outreach',
        insight: `Analyst Insight: This lead has been qualified based on the ${signal.event_category} event. Strategy: Leverage the "${dossier.business_justification}" logic for initial outreach.`,
        context_data: { 
          hotness_score: dossier.hotness_score,
          primary_hurdle: dossier.hurdles 
        }
      });

      // STEP C: Clear the Inbox
      await supabase
        .from('user_signals')
        .update({ status: 'promoted' })
        .eq('id', signalId);

    } else if (action === 'dismiss') {
      // Archive the signal so it doesn't clutter the firehose
      await supabase
        .from('user_signals')
        .update({ status: 'dismissed' })
        .eq('id', signalId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Action API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process action" }, { status: 500 });
  }
}

```

### page and component

app/signals/page.tsx

```tsx
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

```

app/signals/SignalsClient.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  Plus,
  Check,
  X,
  ExternalLink,
  Loader2,
  Inbox,
  Globe,
  Archive,
  Filter,
  Building2,
  TrendingUp,
  Calendar,
  Shield,
  Newspaper,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import ManualSignalModal from '@/components/signals/ManualSignalModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database } from '../../database.types';

type RawSignal = Database['public']['Tables']['raw_signals']['Row'];
type SignalType = Database['public']['Enums']['signal_category'];

type ExtendedSignal = RawSignal & {
  status?: string;
};

interface SignalTypeConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  badgeColor: string;
  description: string;
}

const SIGNAL_TYPES: Record<SignalType, SignalTypeConfig> = {
  'Company News': {
    label: 'Company News',
    icon: Newspaper,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColor: 'border-l-blue-500',
    badgeColor: 'bg-blue-500',
    description: 'Mergers, acquisitions, funding, product launches',
  },
  'Industry Trend': {
    label: 'Industry Trend',
    icon: TrendingUp,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColor: 'border-l-emerald-500',
    badgeColor: 'bg-emerald-500',
    description: 'Market shifts, emerging technologies, sector movements',
  },
  'Events/Meetups': {
    label: 'Events/Meetups',
    icon: Calendar,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    borderColor: 'border-l-purple-500',
    badgeColor: 'bg-purple-500',
    description: 'Conferences, webinars, networking opportunities',
  },
  'Regulatory/Government': {
    label: 'Regulatory/Government',
    icon: Shield,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColor: 'border-l-amber-500',
    badgeColor: 'bg-amber-500',
    description: 'Policy changes, compliance updates, government initiatives',
  },
};

const getEventCategoryStyle = (category: string | null): string => {
  const styles: Record<string, string> = {
    Launch: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Funding: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'New Hire': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Expansion: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Partnership: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'M&A': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Regulatory Update': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    styles[category || ''] ||
    'bg-gray-500/10 text-gray-400 border-gray-500/20'
  );
};

const getSignalTypeConfig = (
  signalType: SignalType | null
): SignalTypeConfig => {
  if (signalType && SIGNAL_TYPES[signalType]) {
    return SIGNAL_TYPES[signalType];
  }
  return {
    label: 'Company News',
    icon: Newspaper,
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    borderColor: 'border-l-gray-500',
    badgeColor: 'bg-gray-500',
    description: 'General company news',
  };
};

export default function SignalsClient({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'search' | 'archive'>(
    'inbox'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSignalTypes, setSelectedSignalTypes] = useState<SignalType[]>(
    []
  );
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: signals, isLoading } = useQuery<ExtendedSignal[]>({
    queryKey: ['signals', activeTab, searchQuery, selectedSignalTypes],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: activeTab,
        q: searchQuery,
        signal_types: selectedSignalTypes.join(','),
      });
      const res = await fetch(`/api/signals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    },
  });

  const triageMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'new' | 'dismissed';
    }) => {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_signal_id: id, action }),
      });
      if (!res.ok) throw new Error('Failed to update signal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Signal updated');
    },
    onError: () => {
      toast.error('Failed to update signal');
    },
  });

  const toggleSignalType = (type: SignalType) => {
    setSelectedSignalTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedSignalTypes([]);
    setSearchQuery('');
  };

  const activeFilterCount = selectedSignalTypes.length;

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-card rounded-lg border border-border/60 p-4 animate-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-muted rounded"></div>
                <div className="h-5 w-24 bg-muted rounded"></div>
              </div>
              <div className="h-5 w-3/4 bg-muted rounded"></div>
              <div className="h-4 w-full bg-muted rounded"></div>
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-20 bg-muted rounded"></div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-muted rounded"></div>
              <div className="h-8 w-8 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
        {activeTab === 'inbox' && <Inbox className="h-8 w-8 text-muted-foreground" />}
        {activeTab === 'search' && <Globe className="h-8 w-8 text-muted-foreground" />}
        {activeTab === 'archive' && <Archive className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">No signals found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {searchQuery || selectedSignalTypes.length > 0
          ? 'Try adjusting your filters or search term.'
          : activeTab === 'inbox'
          ? 'Your inbox is empty. Browse the Firehose or add a manual signal.'
          : activeTab === 'search'
          ? 'No signals available in the global feed at the moment.'
          : 'Your archive is empty. Dismiss signals from your inbox to see them here.'}
      </p>
      {(searchQuery || selectedSignalTypes.length > 0) && (
        <Button variant="outline" onClick={clearFilters} className="mt-4">
          Clear Filters
        </Button>
      )}
      {activeTab === 'inbox' && !searchQuery && selectedSignalTypes.length === 0 && (
        <Button
          variant="outline"
          onClick={() => setActiveTab('search')}
          className="mt-4"
        >
          Browse Firehose
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Curated opportunities matched to your ideal customer profile
          </p>
        </div>
        <Button
          onClick={() => setIsManualModalOpen(true)}
          className="shadow-sm gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Signal
        </Button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-muted/50 p-1 w-full lg:w-auto">
            {['inbox', 'search', 'archive'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 lg:flex-none gap-2"
              >
                {tab === 'inbox' && <Inbox className="h-4 w-4" />}
                {tab === 'search' && <Globe className="h-4 w-4" />}
                {tab === 'archive' && <Archive className="h-4 w-4" />}
                {tab === 'search' ? 'Firehose' : tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search company or keyword..."
              className="pl-9 h-10 bg-muted/50 border-muted focus:bg-background transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 relative">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Signal Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.entries(SIGNAL_TYPES) as [SignalType, SignalTypeConfig][]).map(
                ([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedSignalTypes.includes(type)}
                      onCheckedChange={() => toggleSignalType(type)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                }
              )}
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full justify-start text-muted-foreground"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active filter chips */}
      {selectedSignalTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {selectedSignalTypes.map((type) => {
            const config = SIGNAL_TYPES[type];
            const Icon = config?.icon || Building2;
            return (
              <Badge
                key={type}
                variant="secondary"
                className="gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-muted"
                onClick={() => toggleSignalType(type)}
              >
                <Icon className="h-3 w-3" />
                {config?.label || type}
                <XCircle className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Signals list */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : !signals || signals.length === 0 ? (
          <EmptyState />
        ) : (
          signals.map((signal) => {
            const signalType = signal.signal_type || 'Company News';
            const config = getSignalTypeConfig(signalType);
            const SignalTypeIcon = config.icon;
            const borderColorClass = config.borderColor;

            return (
              <div
                key={signal.id}
                onClick={() => router.push(`/signals/${signal.id}`)}
                className={`group bg-card rounded-lg border-l-4 ${borderColorClass} border border-border/60 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer`}
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold px-2 py-0.5 gap-1 border ${config.color}`}
                        >
                          <SignalTypeIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2">
                          {signal.title || 'Untitled Signal'}
                        </h3>
                      </div>

                      {signal.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {signal.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        {signal.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {signal.company_name}
                          </span>
                        )}
                        {signal.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(signal.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {signal.event_category && (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium px-2 py-0.5 border ${getEventCategoryStyle(
                              signal.event_category
                            )}`}
                          >
                            {signal.event_category}
                          </Badge>
                        )}
                        {signal.sectors?.slice(0, 2).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-muted/60 text-muted-foreground font-normal"
                          >
                            {s}
                          </Badge>
                        ))}
                        {signal.sectors && signal.sectors.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{signal.sectors.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-auto lg:ml-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          triageMutation.mutate({
                            id: signal.id,
                            action: activeTab === 'search' ? 'new' : 'dismissed',
                          });
                        }}
                      >
                        {activeTab === 'search' ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden sm:inline">Add</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden sm:inline">Dismiss</span>
                          </>
                        )}
                      </Button>
                      {signal.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                          asChild
                        >
                          <a
                            href={signal.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Open link</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {signals && signals.length > 0 && (searchQuery || selectedSignalTypes.length > 0) && (
        <div className="text-center text-xs text-muted-foreground pt-2">
          {signals.length} result{signals.length !== 1 ? 's' : ''}
        </div>
      )}

      <ManualSignalModal open={isManualModalOpen} onOpenChange={setIsManualModalOpen} />
    </div>
  );
}

```