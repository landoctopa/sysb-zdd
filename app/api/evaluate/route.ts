// app/api/evaluate/route.ts
import { NextResponse } from 'next/server';

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
            content: `You are an expert sales companion helping small creative studios, agencies, and independent business owners optimize their online profiles. 
Speak in warm, encouraging, plain English. Never use dry corporate sales jargon. 

Evaluate their cold outreach readiness based on their details. If a LinkedIn link is provided but you cannot read it due to standard platform login gates, explicitly note that as a mild hurdle under opportunities using the "z reasons" breakdown (e.g., security walls or strict privacy locks) and base your core breakdown on what you can gather from their main website brand data.`
          },
          {
            role: 'user',
            content: `Please run a sales-readiness audit on this company:
            Website Link: ${website}
            LinkedIn Profile: ${linkedin || 'Not provided'}

            Return ONLY a valid JSON object matching this exact structural format:
            {
              "companyName": "Estimated company name",
              "intro": "A short, encouraging phrase giving a fresh perspective on their digital setup.",
              "theGood": [
                "Credential or foundation element that immediately builds authority",
                "Observed asset or strength that should be capitalized on"
              ],
              "gaps": {
                "website": [
                  "Specific thing that looks more like a resume than a client-focused layout",
                  "Missing portfolio/case study indicators or confusing internal messaging blocks"
                ],
                "linkedin": [
                  "Detailed observation about their visibility. If LinkedIn was locked or unprovided, output exactly: 'Your LinkedIn profile could not be accessed directly because of standard login gates or strict privacy walls. Since clients check your profile the second you send a note, this makes it an invisible profile hurdle.'"
                ]
              },
              "actionPlan": [
                { "priority": "Immediate (Next 1-2 Weeks)", "item": "Fix label", "action": "Simple tactical step instructions" },
                { "priority": "Near-Term (Next 1-2 Months)", "item": "Build label", "action": "Simple tactical build step" }
              ]
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
    return NextResponse.json({ error: 'We could not complete the scan right now. Double check your links and try again.' }, { status: 500 });
  }
}