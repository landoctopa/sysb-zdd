// app/api/signals/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const view = searchParams.get('view') || 'inbox';
  const searchQuery = searchParams.get('q') || '';
  const signalTypes = (searchParams.get('signal_types') || '')
    .split(',')
    .filter(Boolean);
  const sectors = (searchParams.get('sectors') || '')
    .split(',')
    .filter(Boolean);
  const eventCategories = (searchParams.get('event_categories') || '')
    .split(',')
    .filter(Boolean);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // 1. Authenticate user context to enforce secure tenant boundaries
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ----- FIREHOSE VIEW (Global search feed, ignores user preferences) -----
  if (view === 'search') {
    let query = supabase
      .from('raw_signals')
      .select('*', { count: 'exact' })
      .eq('status', 'analysed');

    if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);
    if (signalTypes.length) query = query.in('signal_type', signalTypes);
    if (sectors.length) query = query.overlaps('sectors', sectors);
    if (eventCategories.length) query = query.in('event_category', eventCategories);

    const { data, count } = await query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      signals: data || [],
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    });
  }

  // ----- INBOX VIEW (Profile-matched raw signals, un-triaged) -----
  
  // A. Fetch the user's explicit profile matching rules
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_sectors, target_countries, target_event_categories')
    .eq('id', user.id)
    .single();

  const profileSectors = profile?.target_sectors || [];
  const profileCountries = profile?.target_countries || [];
  const profileEventCategories = profile?.target_event_categories || [];

  // B. UNIFIED EXCLUSION ENGINE
  // Run concurrent requests to pull IDs that shouldn't appear in the feed
  const [promotedResponse, dismissedResponse] = await Promise.all([
    supabase
      .from('leads')
      .select('raw_signal_id')
      .eq('user_id', user.id)
      .not('raw_signal_id', 'is', null), // Excludes manual leads
    supabase
      .from('dismissed_signals')
      .select('raw_signal_id')
      .eq('user_id', user.id),
  ]);

  // Combine both datasets into a single array of hidden IDs
  const promotedIds = (promotedResponse.data || []).map((l) => l.raw_signal_id);
  const dismissedIds = (dismissedResponse.data || []).map((d) => d.raw_signal_id);
  
  const touchedIds = [...promotedIds, ...dismissedIds].filter(Boolean);

  // C. BUILD PRIMARY DATA QUERY
  let matchQuery = supabase
    .from('raw_signals')
    .select('*', { count: 'exact' })
    .eq('status', 'analysed');

  // Inject our exclusion parameters only if elements exist to prevent Postgres parsing drops
  if (touchedIds.length > 0) {
    matchQuery = matchQuery.not('id', 'in', `(${touchedIds.join(',')})`);
  }

  // D. APPLY FILTER MATRIX (Fallback to profile parameters if UI values are empty)
  const effectiveSectors = sectors.length ? sectors : profileSectors;
  if (effectiveSectors.length) {
    matchQuery = matchQuery.overlaps('sectors', effectiveSectors);
  }

  if (profileCountries.length) {
    matchQuery = matchQuery.in('country', profileCountries);
  }

  const effectiveEventCategories = eventCategories.length ? eventCategories : profileEventCategories;
  if (effectiveEventCategories.length) {
    matchQuery = matchQuery.in('event_category', effectiveEventCategories);
  }

  if (signalTypes.length) {
    matchQuery = matchQuery.in('signal_type', signalTypes);
  }

  if (searchQuery) {
    matchQuery = matchQuery.ilike('title', `%${searchQuery}%`);
  }

  // E. EXECUTE RANGE CONSTRAINTS
  const { data: matches, count: matchTotal } = await matchQuery
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    signals: matches || [],
    total: matchTotal || 0,
    hasMore: offset + limit < (matchTotal || 0),
  });
}