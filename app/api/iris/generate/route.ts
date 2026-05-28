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
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('Missing DEEPSEEK_API_KEY environment variable setup');
    throw new Error('AI copy services are currently not configured');
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model === 'deepseek-chat' ? 'deepseek-chat' : 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`DeepSeek proxy endpoint returned error ${res.status}: ${errorText}`);
    throw new Error(`AI service encountered an execution block: ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAiOutput(text);
}

// ─── Text Prompt Compilation Helpers ─────────────────────────────────────────
function buildUserMessage(
  context: Record<string, unknown>,
  outputFormat: string | Record<string, string>
): string {
  const contextStr = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');

  let formatStr: string;
  if (typeof outputFormat === 'string') {
    formatStr = `Return as: ${outputFormat}. Return ONLY valid JSON records.`;
  } else {
    formatStr = `Return a JSON object with these exact keys: ${JSON.stringify(outputFormat)}. Return ONLY the plain JSON code, do not add markdown wrapping ticks or intro commentary.`;
  }

  return `Context Details:\n${contextStr}\n\nFormatting Guidelines:\n${formatStr}`;
}

function parseAiOutput(text: string): any {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return { message: text.trim() };
  }
}