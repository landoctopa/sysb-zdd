// app/signals/all/AllSignalsClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search as SearchIcon,
    ExternalLink,
    Loader2,
    Filter,
    Building2,
    TrendingUp,
    Calendar,
    Shield,
    Newspaper,
    XCircle,
    ArrowLeft,
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
import { SECTOR_LABELS, EVENT_CATEGORY_LABELS, EVENT_CATEGORIES, SECTORS } from '@/utils/constants';
import { Database } from '../../../../database.types';

type RawSignal = Database['public']['Tables']['raw_signals']['Row'];
type SignalType = Database['public']['Enums']['signal_category'];

const SIGNAL_TYPE_OPTIONS: { value: SignalType; label: string; icon: React.ElementType }[] = [
    { value: 'Company News', label: 'Company News', icon: Newspaper },
    { value: 'Industry Trend', label: 'Industry Trend', icon: TrendingUp },
    { value: 'Events/Meetups', label: 'Events/Meetups', icon: Calendar },
    { value: 'Regulatory/Government', label: 'Regulatory/Government', icon: Shield },
];

export default function AllSignalsClient() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSignalTypes, setSelectedSignalTypes] = useState<SignalType[]>([]);
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedEventCategories, setSelectedEventCategories] = useState<string[]>([]);
    const [offset, setOffset] = useState(0);
    const [allSignals, setAllSignals] = useState<RawSignal[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const limit = 20;

    // Reset offset when filters change
    useEffect(() => {
        setOffset(0);
        setAllSignals([]);
    }, [searchQuery, selectedSignalTypes, selectedSectors, selectedEventCategories]);

    const { data, isLoading } = useQuery<{
        signals: RawSignal[];
        total: number;
        hasMore: boolean;
    }>({
        queryKey: ['all-signals', searchQuery, selectedSignalTypes, selectedSectors, selectedEventCategories, offset],
        queryFn: async () => {
            const params = new URLSearchParams({
                view: 'search',
                q: searchQuery,
                signal_types: selectedSignalTypes.join(','),
                sectors: selectedSectors.join(','),
                event_categories: selectedEventCategories.join(','),
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
            if (offset === 0) setAllSignals(data.signals);
            else setAllSignals((prev) => [...prev, ...data.signals]);
            setHasMore(data.hasMore);
        }
    }, [data, offset]);

    const loadMore = () => setOffset((prev) => prev + limit);

    const toggleSignalType = (type: SignalType) => {
        setSelectedSignalTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const toggleSector = (sector: string) => {
        setSelectedSectors((prev) =>
            prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
        );
    };

    const toggleEventCategory = (category: string) => {
        setSelectedEventCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
    };

    const clearFilters = () => {
        setSelectedSignalTypes([]);
        setSelectedSectors([]);
        setSelectedEventCategories([]);
        setSearchQuery('');
    };

    const activeFilterCount = selectedSignalTypes.length + selectedSectors.length + selectedEventCategories.length;

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-lg border border-border/60 p-4 animate-pulse">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                            <div className="flex gap-2"><div className="h-5 w-20 bg-muted rounded"></div><div className="h-5 w-24 bg-muted rounded"></div></div>
                            <div className="h-5 w-3/4 bg-muted rounded"></div>
                            <div className="h-4 w-full bg-muted rounded"></div>
                            <div className="flex gap-2 mt-2"><div className="h-6 w-20 bg-muted rounded"></div><div className="h-6 w-16 bg-muted rounded"></div></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const EmptyState = () => (
        <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4"><SearchIcon className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold mb-1">No signals found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Try adjusting your filters or search term.</p>
            {activeFilterCount > 0 && <Button variant="outline" onClick={clearFilters} className="mt-4">Clear Filters</Button>}
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/signals')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Signals
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Signals</h1>
                    <p className="text-muted-foreground">Browse the complete firehose of all signals (no profile filtering).</p>
                </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search title or company..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel>Signal Types</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SIGNAL_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <DropdownMenuCheckboxItem key={value} checked={selectedSignalTypes.includes(value)} onCheckedChange={() => toggleSignalType(value)}>
                                <Icon className="h-4 w-4 mr-2" /> {label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Sectors</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SECTORS.map((sector) => (
                            <DropdownMenuCheckboxItem key={sector} checked={selectedSectors.includes(sector)} onCheckedChange={() => toggleSector(sector)}>
                                {SECTOR_LABELS[sector] || sector}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Event Categories</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {EVENT_CATEGORIES.map((cat) => (
                            <DropdownMenuCheckboxItem key={cat} checked={selectedEventCategories.includes(cat)} onCheckedChange={() => toggleEventCategory(cat)}>
                                {EVENT_CATEGORY_LABELS[cat] || cat}
                            </DropdownMenuCheckboxItem>
                        ))}
                        {activeFilterCount > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full justify-start text-muted-foreground">
                                    <XCircle className="h-4 w-4 mr-2" /> Clear all
                                </Button>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedSignalTypes.map((type) => {
                        const opt = SIGNAL_TYPE_OPTIONS.find(o => o.value === type);
                        const IconComponent = opt?.icon;
                        return (
                            <Badge key={type} variant="secondary" className="gap-1">
                                {IconComponent && <IconComponent className="h-3 w-3" />}
                                {opt?.label}
                                <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleSignalType(type)} />
                            </Badge>
                        );
                    })}
                    {selectedSectors.map((s) => (
                        <Badge key={s} variant="secondary">
                            {SECTOR_LABELS[s] || s}
                            <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleSector(s)} />
                        </Badge>
                    ))}
                    {selectedEventCategories.map((c) => (
                        <Badge key={c} variant="secondary">
                            {EVENT_CATEGORY_LABELS[c] || c}
                            <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleEventCategory(c)} />
                        </Badge>
                    ))}
                </div>
            )}

            {/* Signals list */}
            <div className="space-y-4">
                {isLoading && allSignals.length === 0 ? <LoadingSkeleton /> : allSignals.length === 0 ? <EmptyState /> : allSignals.map((signal) => {
                    const signalType = signal.signal_type;
                    const config = SIGNAL_TYPE_OPTIONS.find(o => o.value === signalType);
                    const Icon = config?.icon || Newspaper;
                    return (
                        <div key={signal.id} className="bg-card rounded-xl border border-border/60 p-5 transition-all">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" /> {config?.label || signalType}</Badge>
                                        <h3 className="font-bold text-lg">{signal.title}</h3>
                                    </div>
                                    {signal.description && <p className="text-sm text-foreground/75 mb-3">{signal.description}</p>}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {signal.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {signal.company_name}</span>}
                                        {signal.published_at && <span><Calendar className="h-3 w-3 inline mr-1" /> {new Date(signal.published_at).toLocaleDateString()}</span>}
                                    </div>
                                    {signal.sectors && signal.sectors.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">{signal.sectors.slice(0, 3).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{SECTOR_LABELS[s] || s}</Badge>)}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {signal.link && <Button variant="ghost" size="icon" asChild><a href={signal.link} target="_blank"><ExternalLink className="h-4 w-4" /></a></Button>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Load more
                    </Button>
                </div>
            )}
        </div>
    );
}