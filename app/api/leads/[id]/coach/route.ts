import { createClient } from '@/utils/supabase/server';
import { getLeadContext } from '@/lib/lead-context';
import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Get context
  const context = await getLeadContext(id);

  // 2. Build prompt (using template from your spec)
  const prompt = buildCoachPrompt(context);

  // 3. Call DeepSeek
  const aiResponse = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  const aiData = await aiResponse.json();
  const coachOutput = JSON.parse(aiData.choices[0].message.content);

  // 4. Insert into ai_coach_logs
  const { data: newLog, error } = await supabase
    .from('ai_coach_logs')
    .insert({
      lead_id: id,
      insight: coachOutput.insight,
      action_type: coachOutput.action_type,
      action_payload: coachOutput.action_payload,
      context_snapshot: context,
      stage: context.lead.status,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newLog);
}

function buildCoachPrompt(context: any): string {
  return `You are an expert B2B sales coach for a solopreneur.  
Current lead state:
- Stage: ${context.lead.status}
- Company: ${context.lead.company_name}, ${context.lead.country}
- Event: ${context.lead.event_category || 'N/A'}, Hotness: ${context.lead.hotness_score}/100
- Timeline: ${context.lead.deal_timeline || 'N/A'}

Strategic analysis:
- Analysis: ${context.lead.strategic_analysis || 'N/A'}
- Trigger: ${context.lead.trigger_alignment || 'N/A'}
- Hurdles: ${context.lead.strategic_hurdles || 'N/A'}
- Justification: ${context.lead.business_justification || 'N/A'}

Progress:
- Communications sent: ${context.communications.total} (${JSON.stringify(context.communications.by_type)})
- Tasks: ${context.tasks.completed}/${context.tasks.total} completed. Next due: ${context.tasks.next_due_date || 'none'}
- Contacts: ${context.contacts.total} (${context.contacts.with_email} have email)
- Proposal drafted: ${context.lead.proposal_generated ? 'Yes' : 'No'}

Recent activity: ${JSON.stringify(context.recent_activity)}

Based on this, suggest ONE concrete next action that moves the deal forward.  
Output strict JSON:
{
  "insight": "string",
  "action_type": "email|meeting|call_script|task|proposal|none",
  "action_payload": {
    // email: { "contact_id": "uuid", "subject": "...", "body": "..." }
    // meeting: { "title": "...", "start_datetime": "ISO", "duration_minutes": 30, "agenda": "..." }
    // task: { "title": "...", "description": "...", "suggested_due_date": "ISO" }
    // call_script: { "script": "...", "objective": "..." }
    // proposal: { "key_points": ["..."] }
    // none: {}
  }
}`;
}