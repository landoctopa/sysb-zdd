// app/api/demo-match/route.ts
import { NextResponse } from 'next/server';
// FIX 1: Import your newly configured modern server client factory instead of the bare sdk
import { createClient } from '@/utils/supabase/server';
import { SECTORS, EVENT_CATEGORIES } from '@/utils/constants';

// Simple in‑memory rate limiter (resets on restart)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(ip) || 0;
  if (now - last < RATE_LIMIT_WINDOW_MS) {
    const count = (rateLimitMap.get(ip + '_count') || 0) + 1;
    rateLimitMap.set(ip + '_count', count);
    return count > MAX_REQUESTS_PER_WINDOW;
  }
  rateLimitMap.set(ip, now);
  rateLimitMap.set(ip + '_count', 1);
  return false;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { description } = await req.json();
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a meaningful description.' }, { status: 400 });
    }

    // Build string lists for the AI prompt
    const sectorsList = SECTORS.map(s => `"${s}"`).join(', ');
    const eventCatList = EVENT_CATEGORIES.map(e => `"${e}"`).join(', ');

    // Call DeepSeek to infer the profile
    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a business analyst. Based on the user's business description, infer their ideal customer profile.
Return ONLY a JSON object with these keys:
- "sectors": array of strings, choosing from this exact list: [${sectorsList}]
- "countries": array of ISO 3166-1 alpha-2 codes (lowercase) where the business likely operates or targets (e.g., "in", "us")
- "event_categories": array of strings from this exact list: [${eventCatList}]

Choose the most relevant 2-4 sectors, 1-3 countries, and 2-4 event categories that would indicate a potential sales opportunity for this business.`
          },
          { role: 'user', content: `Business description: "${description}"` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) throw new Error('AI extraction failed');

    const aiData = await aiResponse.json();
    const profile = JSON.parse(aiData.choices[0].message.content);

    // Filter only canonical values using Sets (type‑safe)
    const sectorsSet = new Set<string>(SECTORS);
    const eventSet = new Set<string>(EVENT_CATEGORIES);

    const sectors = (profile.sectors || []).filter((s: string) => sectorsSet.has(s));
    const countries = (profile.countries || []).filter((c: string) => /^[a-z]{2}$/.test(c));
    const eventCategories = (profile.event_categories || []).filter((e: string) => eventSet.has(e));

    // FIX 2: Initialize the Supabase server client inside the execution context thread.
    // This dynamically processes cookies and safely evaluates environment properties without crashing on build.
    const supabase = await createClient();

    // Query matching raw_signals
    let matchQuery = supabase
      .from('raw_signals')
      .select('*')
      .eq('status', 'analysed')
      .order('published_at', { ascending: false })
      .limit(6);

    if (sectors.length > 0) matchQuery = matchQuery.overlaps('sectors', sectors);
    if (countries.length > 0) matchQuery = matchQuery.in('country', countries);
    if (eventCategories.length > 0) matchQuery = matchQuery.in('event_category', eventCategories);

    const { data: signals } = await matchQuery;

    return NextResponse.json({
      profile: { sectors, countries, event_categories: eventCategories },
      signals: signals || [],
    });
  } catch (error: any) {
    console.error('Demo match error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}