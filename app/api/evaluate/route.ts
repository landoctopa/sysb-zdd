// app/api/evaluate/route.ts
import { NextResponse } from 'next/server';
import { SECTORS, EVENT_CATEGORIES } from '@/utils/constants';

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;

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
    return NextResponse.json({ error: 'Take a breath! You are running audits a bit too fast. Try again in a minute.' }, { status: 429 });
  }

  try {
    const { website, linkedin } = await req.json();
    if (!website || typeof website !== 'string' || website.trim().length < 4) {
      return NextResponse.json({ error: 'Please enter a valid website link so we can run the audit.' }, { status: 400 });
    }

    const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash', 
        thinking: { type: 'enabled' },
        messages: [
          {
            role: 'system',
            content: `You are an expert sales companion helping small creative studios, agencies, and independent business owners optimize their profiles. Speak in warm, plain English.
            
            Based on their digital footprint, match their offerings against our canonical system categories to infer who their targets might be:
            - System Sectors available: ${JSON.stringify(SECTORS)}
            - System Event Categories available: ${JSON.stringify(EVENT_CATEGORIES)}
            - Target Countries: Must be lowercase ISO alpha-2 codes (e.g. "in", "us", "ae", "sg", "gb")`
          },
          {
            role: 'user',
            content: `Please run a sales-readiness audit on this company and infer their customer target profile arrays:
            Website Link: ${website}
            LinkedIn Profile: ${linkedin || 'Not provided'}

            Return ONLY a valid JSON object matching this exact structural format:
            {
              "companyName": "Estimated company name",
              "intro": "A short, encouraging phrase giving a fresh perspective on their digital setup.",
              "theGood": [
                "Credential or foundation element that builds authority",
                "Observed asset or strength"
              ],
              "gaps": {
                "website": ["Specific item to fix"],
                "linkedin": ["Visibility check note"]
              },
              "actionPlan": [
                { "priority": "Immediate (Next 1-2 Weeks)", "item": "Fix label", "action": "Simple instruction" }
              ],
              "inferredSectors": ["Pick 1-3 highly relevant sector strings from the allowed System Sectors list"],
              "inferredCountries": ["Pick 1-2 lowercase country codes like 'in' or 'us'"],
              "inferredEventCategories": ["Pick 1-3 event category strings from the allowed System Event Categories list"]
            }`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) throw new Error('AI engine failed to respond');

    const aiData = await aiResponse.json();
    const resultPayload = JSON.parse(aiData.choices[0].message.content);

    return NextResponse.json(resultPayload);
  } catch (error) {
    console.error('Audit route exception:', error);
    return NextResponse.json({ error: 'We could not complete the scan right now.' }, { status: 500 });
  }
}