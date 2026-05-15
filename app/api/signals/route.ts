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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ----- VIEWED VIEW: user_signals (new or dismissed) – kept for backward compatibility -----
  if (view === 'viewed') {
    let countQuery = supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'dismissed']);

    if (searchQuery) countQuery = countQuery.ilike('title', `%${searchQuery}%`);
    const { count: total, error: countError } = await countQuery;
    if (countError)
      return NextResponse.json({ error: countError.message }, { status: 500 });

    let dataQuery = supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['new', 'dismissed'])
      .order('created_at', { ascending: false });
    if (searchQuery) dataQuery = dataQuery.ilike('title', `%${searchQuery}%`);
    const { data: signals, error: dataError } = await dataQuery.range(offset, offset + limit - 1);
    if (dataError)
      return NextResponse.json({ error: dataError.message }, { status: 500 });

    return NextResponse.json({
      signals: signals || [],
      total: total || 0,
      hasMore: offset + limit < (total || 0),
    });
  }

  // ----- FIREHOSE VIEW (global, no personalization, no exclusion of touched) -----
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

  // ----- INBOX VIEW (profile-matched raw signals, untouched) -----
  // Fetch user's profile preferences (used as fallback if no explicit filters are provided)
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_sectors, target_countries, target_event_categories')
    .eq('id', user.id)
    .single();

  const profileSectors = profile?.target_sectors || [];
  const profileCountries = profile?.target_countries || [];
  const profileEventCategories = profile?.target_event_categories || [];

  // Get all raw_signal_ids already touched by this user (to exclude them)
  const { data: touched } = await supabase
    .from('user_signals')
    .select('raw_signal_id')
    .eq('user_id', user.id);
  const touchedIds = (touched || []).map((t) => t.raw_signal_id).filter(Boolean);

  let matchQuery = supabase
    .from('raw_signals')
    .select('*', { count: 'exact' })
    .eq('status', 'analysed');

  // Exclude touched signals
  if (touchedIds.length) matchQuery = matchQuery.not('id', 'in', `(${touchedIds.join(',')})`);

  // Apply filters – use explicit query params if provided, otherwise fall back to profile preferences
  // For sectors: use explicit sectors if given, else use profile sectors
  const effectiveSectors = sectors.length ? sectors : profileSectors;
  if (effectiveSectors.length) matchQuery = matchQuery.overlaps('sectors', effectiveSectors);

  // For countries: always use profile countries (not exposed in UI yet, but kept)
  if (profileCountries.length) matchQuery = matchQuery.in('country', profileCountries);

  // For event categories: use explicit if given, else profile
  const effectiveEventCategories = eventCategories.length ? eventCategories : profileEventCategories;
  if (effectiveEventCategories.length) matchQuery = matchQuery.in('event_category', effectiveEventCategories);

  // Signal type filter from client
  if (signalTypes.length) matchQuery = matchQuery.in('signal_type', signalTypes);

  // Global search
  if (searchQuery) matchQuery = matchQuery.ilike('title', `%${searchQuery}%`);

  const { data: matches, count: matchTotal } = await matchQuery
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    signals: matches || [],
    total: matchTotal || 0,
    hasMore: offset + limit < (matchTotal || 0),
  });
}