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

  // ----- VIEWED VIEW: user_signals (new or dismissed) -----
  if (view === 'viewed') {
    let countQuery = supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'dismissed']);

    if (searchQuery) {
      countQuery = countQuery.ilike('title', `%${searchQuery}%`);
    }

    const { count: total, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    let dataQuery = supabase
      .from('user_signals')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['new', 'dismissed'])
      .order('created_at', { ascending: false });

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

  // Get all raw_signal_ids already touched by this user
  const { data: touched } = await supabase
    .from('user_signals')
    .select('raw_signal_id')
    .eq('user_id', user.id);

  const touchedIds = (touched || []).map((t) => t.raw_signal_id).filter(Boolean);

  // ----- FIREHOSE VIEW (global, no personalization) -----
  if (view === 'search') {
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

  // ----- INBOX VIEW (profile-matched raw signals, untouched) -----
  let matchQuery = supabase
    .from('raw_signals')
    .select('*', { count: 'exact' })
    .eq('status', 'analysed');

  // Exclude touched signals
  if (touchedIds.length > 0) {
    matchQuery = matchQuery.not('id', 'in', `(${touchedIds.join(',')})`);
  }

  // Profile-based filters
  if (sectors.length > 0) {
    matchQuery = matchQuery.overlaps('sectors', sectors);
  }
  if (countries.length > 0) {
    matchQuery = matchQuery.in('country', countries);
  }
  if (eventCategories.length > 0) {
    matchQuery = matchQuery.in('event_category', eventCategories);
  }

  // Manual UI filter
  if (signalTypes.length > 0) {
    matchQuery = matchQuery.in('signal_type', signalTypes);
  }

  const { data: matches, count: matchTotal } = await matchQuery
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    signals: matches || [],
    total: matchTotal || 0,
    hasMore: offset + limit < (matchTotal || 0),
  });
}

