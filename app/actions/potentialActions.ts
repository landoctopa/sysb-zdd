// app/actions/potentialActions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper: Generate dossier via DeepSeek (shared)
async function generateDossierForRawSignal(raw: any, profile: any) {
  console.log('[Dossier] Starting generation for:', raw.title);
  console.log('[Dossier] Raw signal data:', {
    company_name: raw.company_name,
    title: raw.title,
    description: raw.description?.substring(0, 100),
    event_category: raw.event_category,
  });

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

  console.log('[Dossier] Calling DeepSeek API...');
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

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Dossier] DeepSeek API error:', res.status, errorText);
    throw new Error(`DeepSeek API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  console.log('[Dossier] DeepSeek response received');
  const dossier = JSON.parse(data.choices[0].message.content);
  console.log('[Dossier] Parsed dossier:', dossier);
  return dossier;
}

/**
 * Copy a raw signal to user_signals (potential), generate dossier, and redirect.
 */
export async function copyRawToPotential(rawSignalId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 1. Fetch raw signal
    const { data: raw, error: rawError } = await supabase
      .from('raw_signals')
      .select('*')
      .eq('id', rawSignalId)
      .single();
    if (rawError || !raw) throw new Error('Raw signal not found');

    // 2. Check if already copied
    const { data: existing } = await supabase
      .from('user_signals')
      .select('id')
      .eq('user_id', user.id)
      .eq('raw_signal_id', raw.id)
      .single();
    if (existing) {
      redirect(`/potentials/${existing.id}`);
    }

    // 3. Fetch user profile for dossier context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, description, offerings, past_projects, ideal_customer_profile')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error('Profile not found');

    // 4. Generate dossier
    const dossier = await generateDossierForRawSignal(raw, profile);

    // 5. Insert into user_signals (no published_at column)
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
        status: 'new',
        ai_dossier: dossier,
        match_score: dossier.hotness_score,
        source: 'raw',
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to copy signal: ${insertError.message}`);

    // 6. Redirect to potential detail page
    redirect(`/potentials/${newPotential.id}`);
  } catch (err) {
    // If it's a redirect, rethrow it (let Next.js handle it)
    if (err && typeof err === 'object' && 'digest' in err && (err as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[copyRawToPotential] Error:', err);
    throw err;
  }
}

/**
 * Regenerate dossier for an existing potential (e.g., if it failed or is empty)
 */
export async function regenerateDossier(potentialId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Fetch potential
  const { data: potential, error: fetchError } = await supabase
    .from('user_signals')
    .select('*')
    .eq('id', potentialId)
    .eq('user_id', user.id)
    .single();
  if (fetchError || !potential) throw new Error('Potential not found');

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, description, offerings, past_projects, ideal_customer_profile')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) throw new Error('Profile not found');

  // Build raw-like object from potential (or use its own raw_signal_id if needed)
  const rawLike = {
    company_name: potential.company_name,
    title: potential.title,
    description: potential.description,
    event_category: potential.event_category,
  };
  const dossier = await generateDossierForRawSignal(rawLike, profile);

  // Update potential with new dossier
  const { error: updateError } = await supabase
    .from('user_signals')
    .update({
      ai_dossier: dossier,
      match_score: dossier.hotness_score,
    })
    .eq('id', potential.id);

  if (updateError) throw new Error(`Failed to regenerate dossier: ${updateError.message}`);

  return { success: true };
}

/**
 * Promote a potential (user_signal) to a lead.
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

  const dossier = potential.ai_dossier as any;

  // 1. Corrected Insert into the 'leads' table
  // Removed non-existent columns: user_signal_id, signal_id, title, country, lead_category
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id: user.id,
      company_name: potential.company_name,
      hotness_score: dossier.hotness_score ?? potential.match_score ?? 0,
      strategic_analysis: dossier.strategic_analysis ?? null,
      trigger_alignment: dossier.trigger_alignment ?? null,
      strategic_hurdles: dossier.hurdles ?? null,
      business_justification: dossier.business_justification ?? null,
      deal_timeline: dossier.estimated_sales_cycle ?? null,
      status: 'new',
      ai_coach_state: {}, // Initializing with an empty JSON object for Iris
    })
    .select()
    .single();

  if (leadError) throw new Error(`Lead promotion failed: ${leadError.message}`);

  // 2. Corrected Insert into 'ai_coach_logs' table
  // Changed 'insight' -> 'message', removed 'action_type', added mandatory enum 'type'
  const { error: logError } = await supabase
    .from('ai_coach_logs')
    .insert({
      lead_id: lead.id,
      stage: 'new',
      message: `Lead promoted from potential: ${potential.title ?? 'Untitled'}. Use the AI coach for next steps.`,
      type: 'entry', // Matches your coach_log_type enum definition
    });

  if (logError) {
    console.error('[promotePotential] Failed to create coach log:', logError.message);
    // Non-blocking fallback or throw depending on preference:
  }

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

  // Generate dossier using a raw-like object
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

  redirect(`/potentials/${newPotential.id}`);
}