// app/api/iris/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { IrisOrchestrator } from '@/lib/iris/orchestrator';
import { saveIrisDraft } from '@/app/actions/iris'; // Import our new layout persistence action

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Pattern 1: action_key + lead_id (client-initiated) ────────────────────
    if (body.action_key && body.lead_id) {
      const supabase = await createClient();

      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Fetch lead with relations
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, contacts(*)')
        .eq('id', body.lead_id)
        .eq('user_id', user.id)
        .single();

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      // FIX: Fetch existing database tasks to populate the updated orchestrator track
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', body.lead_id);

      // Fetch user profile (for product_offering, offerings, etc.)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Instantiated with live task arrays to unlock multi-level depends_on rules
      const orchestrator = new IrisOrchestrator(
        lead,
        (lead.ai_coach_state as Record<string, any>) || {},
        profile || undefined,
        tasks || []
      );

      const result = await orchestrator.runAiAction(body.action_key);
      
      if (result) {
        // FIX: Persistent database tracking for AI assets
        await saveIrisDraft({
          leadId: body.lead_id,
          actionKey: body.action_key,
          payload: result
        });
      }

      return NextResponse.json(result ?? { error: 'No result' });
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

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (err) {
    console.error('[api/iris/generate]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── AI call (DeepSeek only) ─────────────────────────────────────────────────
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
    console.error('Missing DEEPSEEK_API_KEY environment variable');
    throw new Error('AI service not configured');
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
    console.error(`DeepSeek error ${res.status}: ${errorText}`);
    throw new Error(`DeepSeek API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAiOutput(text);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
    formatStr = `Return as: ${outputFormat}. Return ONLY valid JSON.`;
  } else {
    formatStr = `Return a JSON object with these exact keys: ${JSON.stringify(outputFormat)}. Return ONLY the JSON, no markdown fences or extra text.`;
  }

  return `Context:\n${contextStr}\n\n${formatStr}`;
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