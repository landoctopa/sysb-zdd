// app/actions/potentialActions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper: Generate dossier via DeepSeek
async function generateDossierForRawSignal(
  raw: any,
  profile: any
) {
  const prompt = `
You are a Senior Strategic Analyst for ${profile.full_name}.

OUR BUSINESS PROFILE:
- Description: ${profile.description}
- Specific Offerings: ${JSON.stringify(profile.offerings)}
- Relevant Track Record: ${JSON.stringify(profile.past_projects)}
- Ideal Customer Alignment: ${JSON.stringify(profile.ideal_customer_profile)}

THE OPPORTUNITY:
- Company: ${raw.company_name}
- News Event: "${raw.title}"
- Context: "${raw.description}"
- Event Category: ${raw.event_category}

TASK:
Analyze this signal to determine if it should be qualified as a sales lead.
Provide an internal strategic briefing in JSON format with these exact keys:

- "strategic_analysis": string
- "trigger_alignment": string
- "hotness_score": integer (1-100)
- "estimated_sales_cycle": string (e.g., "3-5 Months")
- "business_justification": string
- "hurdles": string

Output ONLY valid JSON.
`;

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a professional business analyst. Output valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek API error: ${res.statusText}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Copy a raw signal to user_signals (potential), generate dossier, and redirect to potential detail page.
 */
export async function copyRawToPotential(rawSignalId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Fetch raw signal
  const { data: raw, error: rawError } = await supabase
    .from('raw_signals')
    .select('*')
    .eq('id', rawSignalId)
    .single();
  if (rawError || !raw) throw new Error('Raw signal not found');

  // Check if already copied
  const { data: existing } = await supabase
    .from('user_signals')
    .select('id')
    .eq('user_id', user.id)
    .eq('raw_signal_id', raw.id)
    .single();

  if (existing) {
    // Already exists, just go to that potential
    redirect(`/potentials/${existing.id}`);
  }

  // Fetch profile for dossier generation
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, description, offerings, past_projects, ideal_customer_profile')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) throw new Error('Profile not found');

  // Generate dossier (may take a few seconds)
  const dossier = await generateDossierForRawSignal(raw, profile);

  // Create user_signal with dossier
  const { data: newPotential, error: insertError } = await supabase
    .from('user_signals')
    .insert({
      user_id: user.id,
      raw_signal_id: raw.id,
      title: raw.title,
      description: raw.description,
      company_name: raw.company_name,
      country: raw.country,
      sectors: raw.sectors,
      event_category: raw.event_category,
      link: raw.link,
      published_at: raw.published_at,
      status: 'new',
      ai_dossier: dossier,
      match_score: dossier.hotness_score,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to copy signal: ${insertError.message}`);

  // Redirect to the new potential detail page
  redirect(`/potentials/${newPotential.id}`);
}

/**
 * Promote a potential (user_signal) to a lead.
 * Requires that the potential already has an ai_dossier.
 */
export async function promotePotential(potentialId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Fetch potential with dossier
  const { data: potential, error: fetchError } = await supabase
    .from('user_signals')
    .select('*')
    .eq('id', potentialId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !potential) throw new Error('Potential not found');
  if (!potential.ai_dossier || Object.keys(potential.ai_dossier).length === 0) {
    throw new Error('Dossier not generated yet');
  }

  const dossier = potential.ai_dossier;

  // Create lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id: user.id,
      user_signal_id: potential.id,
      signal_id: potential.raw_signal_id,
      company_name: potential.company_name,
      title: potential.title,
      country: potential.country,
      lead_category: potential.event_category,
      hotness_score: dossier.hotness_score ?? potential.match_score ?? 0,
      strategic_analysis: dossier.strategic_analysis ?? null,
      trigger_alignment: dossier.trigger_alignment ?? null,
      strategic_hurdles: dossier.hurdles ?? null,
      business_justification: dossier.business_justification ?? null,
      deal_timeline: dossier.estimated_sales_cycle ?? null,
      status: 'new',
    })
    .select()
    .single();

  if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

  // Create initial coach log
  await supabase.from('ai_coach_logs').insert({
    lead_id: lead.id,
    stage: 'new',
    insight: `Lead promoted from potential: ${potential.title ?? 'Untitled'}. Use the AI coach for next steps.`,
    action_type: 'none',
  });

  // Mark potential as promoted
  await supabase
    .from('user_signals')
    .update({ status: 'promoted' })
    .eq('id', potential.id);

  revalidatePath('/potentials');
  revalidatePath('/leads');
  return { leadId: lead.id };
}

/**
 * Dismiss a potential (mark as dismissed)
 */
export async function dismissPotential(potentialId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('user_signals')
    .update({ status: 'dismissed' })
    .eq('id', potentialId)
    .eq('user_id', user.id);

  if (error) throw new Error('Dismiss failed');
  revalidatePath('/potentials');
  return { success: true };
}

/**
 * Create a manual potential directly in user_signals, generate dossier, and redirect.
 */
export async function createManualPotential(formData: {
  title: string;
  company_name?: string;
  description?: string;
  link?: string;
  sectors: string[];
  event_category: string;
  country: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Fetch profile for dossier generation
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, description, offerings, past_projects, ideal_customer_profile')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) throw new Error('Profile not found');

  // Generate dossier using the same helper (needs a raw-like object)
  const rawLike = {
    company_name: formData.company_name,
    title: formData.title,
    description: formData.description,
    event_category: formData.event_category,
  };
  const dossier = await generateDossierForRawSignal(rawLike, profile);

  // Insert into user_signals with source='manual'
  const { data: newPotential, error: insertError } = await supabase
    .from('user_signals')
    .insert({
      user_id: user.id,
      title: formData.title,
      company_name: formData.company_name || null,
      description: formData.description || null,
      sectors: formData.sectors,
      event_category: formData.event_category,
      country: formData.country || null,
      link: formData.link || null,
      source: 'manual',
      status: 'new',
      ai_dossier: dossier,
      match_score: dossier.hotness_score,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to create manual potential: ${insertError.message}`);

  // Redirect to the potential detail page
  redirect(`/potentials/${newPotential.id}`);
}