// app/api/iris/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { IrisOrchestrator } from '@/lib/iris/orchestrator';
import { saveIrisDraft } from '@/app/actions/iris'; // Keeps your layout persistence intact!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Pattern 1: action_key + lead_id (client-initiated) ────────────────────
    if (body.action_key && body.lead_id) {
      const supabase = await createClient();

      // Simple security check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Fetch lead details along with its contacts
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, contacts(*)')
        .eq('id', body.lead_id)
        .eq('user_id', user.id)
        .single();

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead data profile not found' }, { status: 404 });
      }

      // 🛠️ FIX: Changed from 'tasks' to pull directly from your unified actions ledger
      const { data: actions } = await supabase
        .from('actions')
        .select('*')
        .eq('lead_id', body.lead_id);

      // Fetch user business profile fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Instantiated safely using the true database action history array
      const orchestrator = new IrisOrchestrator(
        lead,
        (lead.ai_coach_state as Record<string, any>) || {},
        profile || undefined,
        actions || [] // Fed directly into the checklist calculator
      );

      const result = await orchestrator.runAiAction(body.action_key);

      if (result) {
        // Keeps your template saver active
        await saveIrisDraft({
          leadId: body.lead_id,
          actionKey: body.action_key,
          payload: result
        });
      }

      return NextResponse.json(result ?? { error: 'No response returned from engine' });
    }

    // ── Pattern 2: raw payload from orchestrator (server-side) ────────────────
    if (body.system_prompt && body.context) {
      const result = await callDeepSeek({
        systemPrompt: body.system_prompt,
        userMessage: buildUserMessage(body.context, body.output_format),
        model: body.model || 'deepseek-chat',
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid request layout payload' }, { status: 400 });
  } catch (err) {
    console.error('[api/iris/generate]', err);
    return NextResponse.json(
      { error: 'Internal server processing error' },
      { status: 500 }
    );
  }
}

// app/api/api/iris/generate/route.ts

// ... keep your top request imports and both POST routing blocks exactly as they are

// ─── AI Direct Connection Engine (DeepSeek) ──────────────────────────────────
async function callDeepSeek({
  systemPrompt,
  userMessage,
  model,
}: {
  systemPrompt: string;
  userMessage: string;
  model: string;
}): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY; //[cite: 12]
  if (!apiKey) { //[cite: 12]
    console.error('Missing DEEPSEEK_API_KEY environment variable setup'); //[cite: 12]
    throw new Error('AI copy services are currently not configured'); //[cite: 12]
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`, //[cite: 12]
    },
    body: JSON.stringify({
      model: 'deepseek-chat', //[cite: 12]
      messages: [
        { role: 'system', content: systemPrompt }, //[cite: 12]
        { role: 'user', content: userMessage }, //[cite: 12]
      ],
      // 💎 ENHANCEMENT: Enforce strict native JSON output mode at the provider level
      response_format: {
        type: 'json_object'
      },
      temperature: 0.6, // Tighter creativity controls for high-relevance outreach metrics
      max_tokens: 1500, //[cite: 12]
    }),
  });

  if (!res.ok) { //[cite: 12]
    const errorText = await res.text(); //[cite: 12]
    console.error(`DeepSeek proxy endpoint returned error ${res.status}: ${errorText}`); //[cite: 12]
    throw new Error(`AI service encountered an execution block: ${res.status}`); //[cite: 12]
  }

  const data = await res.json(); //[cite: 12]
  const text = data.choices?.[0]?.message?.content || ''; //[cite: 12]
  return parseAiOutput(text); //[cite: 12]
}

// ─── Text Prompt Compilation Helpers ─────────────────────────────────────────
function buildUserMessage(
  context: Record<string, unknown>,
  outputFormat: string | Record<string, any> // Upgraded typing from string to any object mapping
): string {
  const contextStr = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null) //[cite: 12]
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`) //[cite: 12]
    .join('\n'); //[cite: 12]

  let formatStr: string;
  
  if (typeof outputFormat === 'string') {
    formatStr = `Return as: ${outputFormat}. Return ONLY valid JSON records.`; //[cite: 12]
  } else if (outputFormat && typeof outputFormat === 'object') {
    // 💎 FIX: Detects multi-channel structure to give the copywriter concrete structural rules
    formatStr = `
You must respond with a single, valid JSON object following this exact blueprint:
${JSON.stringify(outputFormat, null, 2)}

Ensure the fields match these specifications:
- "email": Must contain an object with a short text "subject" line and a fully customized text "body".
- "linkedin": Must contain an object with a single text "message" line.

Do not wrap the response in markdown code blocks like \\\`\\\`\\\`json. Return only the raw JSON.`;
  } else {
    formatStr = `Return a JSON object with these exact keys: ${JSON.stringify(outputFormat)}. Return ONLY raw plain JSON code lines.`; //[cite: 12]
  }

  return `Context Details:\n${contextStr}\n\nFormatting Guidelines:\n${formatStr}`; //[cite: 12]
}

// Keep your parseAiOutput helper identical[cite: 12]
function parseAiOutput(text: string): any {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(); //[cite: 12]
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/); //[cite: 12]
  if (jsonMatch) {
    cleaned = jsonMatch[0]; //[cite: 12]
  }
  try {
    return JSON.parse(cleaned); //[cite: 12]
  } catch {
    return { message: text.trim() }; //[cite: 12]
  }
}