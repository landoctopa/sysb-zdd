import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { signalId } = await req.json();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Cache Check
  const { data: existingLead } = await supabase
    .from('user_signals')
    .select('*')
    .eq('id', signalId)
    .single();

  if (existingLead?.ai_dossier && Object.keys(existingLead.ai_dossier).length > 0) {
    return NextResponse.json(existingLead.ai_dossier);
  }

  // 2. Fetch Granular Profile (The "Who am I?" data from Step 1)
  const { data: profile } = await supabase.from('profiles').select(`
    full_name,
    description,
    offerings,
    past_projects,
    ideal_customer_profile
  `).eq('id', user.id).single();

  // 3. Fetch Signal Context
  let signal = existingLead;
  if (!signal) {
    const { data: raw } = await supabase.from('raw_signals').select('*').eq('id', signalId).single();
    signal = raw;
  }

  if (!signal || !profile) return NextResponse.json({ error: 'Context missing' }, { status: 404 });

  // 4. The DeepSeek Strategic Prompt
  const prompt = `
    You are a Senior Strategic Analyst for ${profile.full_name}.
    
    OUR BUSINESS PROFILE:
    - Description: ${profile.description}
    - Specific Offerings: ${JSON.stringify(profile.offerings)}
    - Relevant Track Record: ${JSON.stringify(profile.past_projects)}
    - Ideal Customer Alignment: ${JSON.stringify(profile.ideal_customer_profile)}

    THE OPPORTUNITY:
    - Company: ${signal.company_name}
    - News Event: "${signal.title}"
    - Context: "${signal.description}"
    - Event Category: ${signal.event_category}

    TASK:
    Analyze this signal to determine if it should be qualified as a sales lead. 
    Provide an internal strategic briefing in JSON format with these exact keys:
    
    - "strategic_analysis": A professional analysis of the company's trajectory and why this creates a specific, high-value opening for our offerings.
    - "trigger_alignment": Direct explanation of how this event hits our core sales triggers and why the timing is optimal.
    - "hotness_score": An integer (1-100) representing overall lead quality.
    - "estimated_sales_cycle": Realistic timeframe from first contact to deal closure (e.g., "3-5 Months").
    - "business_justification": An internal strategic note explaining why the client needs our services specifically at this milestone.
    - "hurdles": Key objections or challenges we might face in pursuing this lead, from a strategic standpoint.

    Output ONLY valid JSON.
  `;

  try {
    const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a professional business analyst. Output valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`DeepSeek API error: ${aiResponse.statusText}`);
    }

    const resData = await aiResponse.json();
    const dossier = JSON.parse(resData.choices[0].message.content);

    // 5. Persistence: Save with full mapping
    const { error: saveError } = await supabase
      .from('user_signals')
      .upsert({
        user_id: user.id,
        raw_signal_id: signal.raw_signal_id || (signal.id === signalId ? null : signal.id),
        title: signal.title,
        company_name: signal.company_name,
        description: signal.description,
        link: signal.link,
        country: signal.country,
        sectors: signal.sectors,
        event_category: signal.event_category,
        match_score: dossier.hotness_score,
        status: 'new',
        ai_dossier: dossier 
      }, { onConflict: 'user_id, link' });

    if (saveError) throw new Error(saveError.message);

    return NextResponse.json(dossier);
  } catch (error: any) {
    console.error("Research Error:", error);
    return NextResponse.json({ error: error.message || "Strategic analysis failed." }, { status: 500 });
  }
}