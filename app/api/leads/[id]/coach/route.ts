import { createClient } from '@/utils/supabase/server';
import { getLeadContext } from '@/lib/lead-context';
import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Get context (including lead and existing answers)
  const context = await getLeadContext(id);
  const stage = context.lead.status || 'new';

  // 2. Build stage-specific prompt
  const prompt = buildStagePrompt(context, stage);

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

  // 4. Validate action type based on stage (optional but safe)
  const allowedActions = getAllowedActionsForStage(stage);
  if (coachOutput.action_type && !allowedActions.includes(coachOutput.action_type)) {
    // Fallback to a safe action
    coachOutput.action_type = 'task';
    coachOutput.action_payload = {
      title: 'Review lead',
      description: `Coach suggested an action but it was not allowed for stage ${stage}. Please review the lead manually.`,
    };
  }

  // 5. Insert into ai_coach_logs
  const { data: newLog, error } = await supabase
    .from('ai_coach_logs')
    .insert({
      lead_id: id,
      insight: coachOutput.insight,
      action_type: coachOutput.action_type,
      action_payload: coachOutput.action_payload,
      context_snapshot: context,
      stage: stage,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newLog);
}

// Helper: allowed action types per stage
function getAllowedActionsForStage(stage: string): string[] {
  switch (stage) {
    case 'new':
      return ['email', 'call_script', 'task', 'question', 'none'];
    case 'contacted':
      return ['email', 'meeting', 'task', 'question', 'none'];
    case 'proposal':
      return ['email', 'meeting', 'proposal', 'question', 'none'];
    case 'negotiation':
      return ['email', 'meeting', 'task', 'question', 'none'];
    case 'won':
      return ['none', 'task']; // rarely needed
    default:
      return ['email', 'task', 'question', 'none'];
  }
}

// Stage-specific prompt builder
function buildStagePrompt(context: any, stage: string): string {
  const lead = context.lead;
  const existingAnswers = lead.ai_coach_state?.answers || {};

  const baseInfo = `
Current lead:
- Company: ${lead.company_name || 'Unknown'}
- Country: ${lead.country || 'Unknown'}
- Hotness score: ${lead.hotness_score || 0}/100
- Current status: ${stage}
- Deal timeline: ${lead.deal_timeline || 'Not set'}
- Strategic analysis: ${lead.strategic_analysis || 'Not available'}
- Trigger alignment: ${lead.trigger_alignment || 'Not available'}
- Hurdles: ${lead.strategic_hurdles || 'None'}

Recent activity: ${JSON.stringify(context.recent_activity?.slice(0, 5) || [])}

Already known answers:
${Object.entries(existingAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'None'}

User’s ICP (from profile): ${JSON.stringify(context.profile?.ideal_customer_profile || {})}
`;

  const stageInstructions: Record<string, string> = {
    new: `
You are in the **Qualification** stage. Goal: Determine if the lead fits the ICP, has budget, authority, need, and timeline (BANT). 

Suggested actions:
- Ask for missing BANT information using "question" action.
- If enough info is present, suggest an initial outreach email.
- Create a task to research the lead's decision makers.

Output JSON with:
- insight: a short coaching tip.
- action_type: one of ["email", "call_script", "task", "question", "none"]
- action_payload: 
  * For "question": { "question": "string", "field": "string" } where field is e.g. "budget", "authority", "timeline", "need".
  * For "email": { "contact_id": "uuid or null", "subject": "...", "body": "..." }
  * For "task": { "title": "...", "description": "...", "suggested_due_date": "YYYY-MM-DD" }
  * For "call_script": { "script": "...", "objective": "..." }
`,
    contacted: `
You are in the **Nurturing** stage. The lead has been contacted but not yet ready for a proposal. Goal: Keep engagement warm and identify buying signals.

Suggested actions:
- Suggest sharing a relevant case study or blog post (via email).
- Propose a brief check-in call or meeting.
- Create a task to follow up in X days.
- Ask the user if they received a response to their last outreach.

Output JSON with action_type one of ["email", "meeting", "task", "question", "none"].
`,
    proposal: `
You are in the **Proposal** stage. The lead has asked for a proposal. Goal: Deliver a compelling, tailored proposal.

Suggested actions:
- Generate a proposal outline (action_type "proposal").
- Schedule a presentation meeting.
- Ask for missing information: pricing model, specific requirements, success metrics, approval workflow (use "question").
- Provide talking points for the proposal.

Output JSON. For "proposal", action_payload should include: { "key_points": ["point1", ...], "roi_estimate": "optional string" }.
`,
    negotiation: `
You are in the **Negotiation** stage. Goal: Agree on terms and close.

Suggested actions:
- Provide a negotiation playbook (action_type "task" with description).
- Suggest a meeting to address objections.
- Ask the user about any blocking issues.

Output JSON.
`,
    won: `
You are in the **Closed-Won** stage. Goal: Summarize the deal and suggest post-sale steps.

Suggested actions:
- Generate a deal summary (action_type "task" with summary content).
- Create tasks for onboarding.

Output JSON.
`,
  };

  const instruction = stageInstructions[stage] || stageInstructions.new;

  return `You are an expert B2B sales coach (Iris) for a solopreneur.  
${baseInfo}
${instruction}

Return ONLY valid JSON. Do not include any other text.`;
}