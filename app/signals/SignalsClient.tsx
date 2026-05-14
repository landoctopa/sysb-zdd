'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search as SearchIcon,
  Plus,
  ExternalLink,
  Loader2,
  Inbox,
  Globe,
  Eye,
  Filter,
  Building2,
  TrendingUp,
  Calendar,
  Shield,
  Newspaper,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SECTOR_LABELS, EVENT_CATEGORY_LABELS } from '@/utils/constants';
import { COUNTRY_LABELS } from '@/utils/countries';
import { Database } from '../../database.types';
import { copyRawToPotential } from '@/app/actions/potentialActions';
import { toast } from 'sonner';

type RawSignal = Database['public']['Tables']['raw_signals']['Row'];
type UserSignal = Database['public']['Tables']['user_signals']['Row'];
type SignalType = Database['public']['Enums']['signal_category'];

type ExtendedSignal = (RawSignal | UserSignal) & {
  signal_type?: SignalType | null;
  published_at?: string | null;
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

const EVENT_CATEGORY_STYLES: Record<string, string> = {
  launch: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  funding: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  expansion: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  new_hire: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rebranding: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  partnership: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  merger_acquisition: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  regulatory_update: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  company_news: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  events_meetups: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const getEventCategoryLabel = (category: string | null): string => {
  if (category && EVENT_CATEGORY_LABELS[category]) {
    return EVENT_CATEGORY_LABELS[category];
  }
  return category || 'Other';
};

const getEventCategoryStyle = (category: string | null): string => {
  if (category && EVENT_CATEGORY_STYLES[category]) {
    return EVENT_CATEGORY_STYLES[category];
  }
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const getSectorLabel = (sector: string) => SECTOR_LABELS[sector] || sector;

const getCountryLabel = (code: string | null) =>
  code ? COUNTRY_LABELS[code] || code.toUpperCase() : 'Not specified';

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
  const [activeTab, setActiveTab] = useState<'inbox' | 'search' | 'viewed'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSignalTypes, setSelectedSignalTypes] = useState<SignalType[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [offset, setOffset] = useState(0);
  const [allSignals, setAllSignals] = useState<ExtendedSignal[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  useEffect(() => {
    setOffset(0);
    setAllSignals([]);
  }, [activeTab, searchQuery, selectedSignalTypes]);

  const { data, isLoading } = useQuery<{
    signals: ExtendedSignal[];
    total: number;
    hasMore: boolean;
  }>({
    queryKey: ['signals', activeTab, searchQuery, selectedSignalTypes, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: activeTab,
        q: searchQuery,
        signal_types: selectedSignalTypes.join(','),
        offset: String(offset),
        limit: String(limit),
      });
      const res = await fetch(`/api/signals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllSignals(data.signals);
      } else {
        setAllSignals((prev) => [...prev, ...data.signals]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, offset]);

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

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

  const handleSignalClick = (signal: ExtendedSignal) => {
    const signalType = signal.signal_type || 'Company News';
    // Only actionable if it's Company News
    if (signalType !== 'Company News') return;

    // Show loading toast
    toast.loading('Analyzing signal...', { id: 'copy-potential' });
    startTransition(() => {
      copyRawToPotential(signal.id).catch((err) => {
        toast.error(err.message || 'Failed to copy signal', { id: 'copy-potential' });
      });
    });
  };

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
        {activeTab === 'viewed' && <Eye className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">No signals found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {searchQuery || selectedSignalTypes.length > 0
          ? 'Try adjusting your filters or search term.'
          : activeTab === 'inbox'
            ? 'Your inbox is empty. Browse the Firehose or add a manual signal.'
            : activeTab === 'search'
              ? 'No signals available in the global feed at the moment.'
              : 'You haven’t viewed or dismissed any signals yet.'}
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

  const signals = allSignals;

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
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-muted/50 p-1 w-full lg:w-auto">
            {['inbox', 'search', 'viewed'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 lg:flex-none gap-2"
              >
                {tab === 'inbox' && <Inbox className="h-4 w-4" />}
                {tab === 'search' && <Globe className="h-4 w-4" />}
                {tab === 'viewed' && <Eye className="h-4 w-4" />}
                {tab === 'search' ? 'Firehose' : tab === 'viewed' ? 'Viewed' : 'Inbox'}
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
        {isLoading && allSignals.length === 0 ? (
          <LoadingSkeleton />
        ) : signals.length === 0 ? (
          <EmptyState />
        ) : (
          signals.map((signal) => {
            const signalType = signal.signal_type || 'Company News';
            const config = getSignalTypeConfig(signalType);
            const SignalTypeIcon = config.icon;
            const borderColorClass = config.borderColor;
            const isActionable = signalType === 'Company News';

            return (
              <div
                key={signal.id}
                onClick={() => isActionable && handleSignalClick(signal)}
                className={`group bg-card/90 backdrop-blur-sm rounded-xl border-l-4 ${borderColorClass} border border-border/60 ${
                  isActionable
                    ? 'shadow-sm hover:shadow-xl hover:border-primary/50 cursor-pointer'
                    : 'cursor-default'
                } transition-all duration-200`}
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
                        <h3 className="font-bold text-lg leading-tight text-foreground line-clamp-2">
                          {signal.title || 'Untitled Signal'}
                        </h3>
                      </div>

                      {signal.description && (
                        <p className="text-sm text-foreground/75 line-clamp-2 mb-3">
                          {signal.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        {signal.company_name && (
                          <span className="flex items-center gap-1 font-medium">
                            <Building2 className="h-3 w-3" />
                            {signal.company_name}
                          </span>
                        )}
                        {signal.published_at && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3" />
                            {new Date(signal.published_at).toLocaleDateString()}
                          </span>
                        )}
                        {signal.country && (
                          <span className="flex items-center gap-1 font-medium">
                            <Globe className="h-3 w-3" />
                            {getCountryLabel(signal.country)}
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
                            {getEventCategoryLabel(signal.event_category)}
                          </Badge>
                        )}
                        {signal.sectors &&
                          [...new Set(signal.sectors)].slice(0, 2).map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 bg-muted/60 text-muted-foreground font-normal"
                            >
                              {getSectorLabel(s)}
                            </Badge>
                          ))}
                        {signal.sectors && signal.sectors.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{signal.sectors.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-auto lg:ml-0">
                      {signal.link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                          asChild
                        >
                          <a
                            href={signal.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Open source</span>
                          </a>
                        </Button>
                      )}
                      {isActionable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSignalClick(signal);
                          }}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Analyze</span>
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

      {signals.length > 0 && (searchQuery || selectedSignalTypes.length > 0) && (
        <div className="text-center text-xs text-muted-foreground pt-2">
          {signals.length} result{signals.length !== 1 ? 's' : ''}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more signals'
            )}
          </Button>
        </div>
      )}

    </div>
  );
}