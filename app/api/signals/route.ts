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
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ----- ARCHIVE VIEW: paginated user signals -----
  // ----- ARCHIVE VIEW: paginated user signals -----
if (view === 'archive') {
  // Count total matching records (using head: true to avoid fetching rows)
  let countQuery = supabase
    .from('user_signals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'dismissed');

  if (searchQuery) {
    countQuery = countQuery.ilike('title', `%${searchQuery}%`);
  }

  const { count: total, error: countError } = await countQuery;
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  // Fetch the requested page of data
  let dataQuery = supabase
    .from('user_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'dismissed')
    .order('created_at', { ascending: false }); // ensure created_at column exists

  if (searchQuery) {
    dataQuery = dataQuery.ilike('title', `%${searchQuery}%`);
  }

  const { data: signals, error: dataError } = await dataQuery.range(offset, offset + limit - 1);
  if (dataError) {
    return NextResponse.json({ error: dataError.message }, { status: 500 });
  }

  return NextResponse.json({
    signals: signals || [],
    total: total || 0,
    hasMore: offset + limit < (total || 0),
  });
}

  // ----- COMMON: fetch profile preferences -----
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_sectors, target_countries, target_event_categories')
    .eq('id', user.id)
    .single();

  const sectors = profile?.target_sectors || [];
  const countries = profile?.target_countries || [];
  const eventCategories = profile?.target_event_categories || [];

  // ----- SEARCH VIEW (global firehose, no personalization) -----
  if (view === 'search') {
    // Get IDs of signals already touched by this user (to hide them)
    const { data: touched } = await supabase
      .from('user_signals')
      .select('raw_signal_id')
      .eq('user_id', user.id);

    const touchedIds = (touched || []).map((t) => t.raw_signal_id).filter(Boolean);

    let query = supabase
      .from('raw_signals')
      .select('*', { count: 'exact' })
      .eq('status', 'analysed');

    if (touchedIds.length > 0) {
      query = query.not('id', 'in', `(${touchedIds.join(',')})`);
    }

    if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);
    if (signalTypes.length > 0) query = query.in('signal_type', signalTypes);

    const { data, count } = await query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      signals: data || [],
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    });
  }

  // ----- INBOX VIEW (personalized matches + personal leads) -----
  // 1. Get IDs of raw_signals already in the user's workflow
  const { data: touched } = await supabase
    .from('user_signals')
    .select('raw_signal_id')
    .eq('user_id', user.id);

  const touchedIds = (touched || []).map((t) => t.raw_signal_id).filter(Boolean);

  // 2. Build the match query with profile filters
  let matchQuery = supabase
    .from('raw_signals')
    .select('*', { count: 'exact' })
    .eq('status', 'analysed');

  // Exclude already processed signals (user-specific anti-join)
  if (touchedIds.length > 0) {
    matchQuery = matchQuery.not('id', 'in', `(${touchedIds.join(',')})`);
  }

  // Profile-based filters
  if (sectors.length > 0) {
    matchQuery = matchQuery.overlaps('sectors', sectors); // safe overlap operator
  }
  if (countries.length > 0) {
    matchQuery = matchQuery.in('country', countries);
  }
  if (eventCategories.length > 0) {
    matchQuery = matchQuery.in('event_category', eventCategories);
  }

  // Manual UI filter (signal types)
  if (signalTypes.length > 0) {
    matchQuery = matchQuery.in('signal_type', signalTypes);
  }

  // Paginate the match results
  const { data: matches, count: matchTotal } = await matchQuery
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // 3. Fetch personal signals (always included on first page, limited)
  const { data: personalInbox } = await supabase
    .from('user_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(20); // keep it reasonable

  // 4. Combine, sort, and respond
  const unified = [
    ...(personalInbox || []),
    ...(matches || []),
  ].sort(
    (a, b) =>
      new Date(b.published_at || b.created_at).getTime() -
      new Date(a.published_at || a.created_at).getTime()
  );

  return NextResponse.json({
    signals: unified,
    total: matchTotal || 0, // total count of matching raw signals (excluding personal)
    hasMore: offset + limit < (matchTotal || 0),
  });
}