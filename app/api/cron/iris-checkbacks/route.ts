import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { IrisOrchestrator } from '@/lib/iris/orchestrator';
import type { Lead, CoachState } from '@/lib/iris/types';

// This endpoint is meant to be called by a cron job (e.g., Supabase pg_cron or Vercel Cron Jobs)
// It evaluates checkback rules for all active leads and creates coach logs when needed.

export async function GET(request: NextRequest) {
    // Security check
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = await createClient();

    // Get all leads that are not 'won' or 'lost' (active stages)
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*, contacts(*)')
      .in('status', ['new', 'contacted', 'proposal', 'negotiation'])
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch leads: ${error.message}`);

    const results: { leadId: string; triggered: boolean; ruleId?: string; error?: string }[] = [];

    for (const lead of leads) {
      try {
        // Get the latest activity date from communications or tasks
        const { data: latestActivity } = await supabase
          .from('communications')
          .select('occurred_at')
          .eq('lead_id', lead.id)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .single();

        const lastActivityDate = latestActivity?.occurred_at
          ? new Date(latestActivity.occurred_at)
          : new Date(lead.updated_at);

        const coachState = (lead.ai_coach_state as CoachState) || {};
        const orchestrator = new IrisOrchestrator(lead as Lead, coachState);
        const triggered = await orchestrator.evaluateCheckbacks(lastActivityDate);

        for (const checkback of triggered) {
          // Insert coach log
          await supabase.from('ai_coach_logs').insert({
            lead_id: lead.id,
            stage: lead.status,
            type: 'checkback',
            message: checkback.message,
            suggested_actions: checkback.suggestedActions,
            metadata: { ruleId: checkback.ruleId },
          });
          results.push({ leadId: lead.id, triggered: true, ruleId: checkback.ruleId });
        }
        if (triggered.length === 0) {
          results.push({ leadId: lead.id, triggered: false });
        }
      } catch (err) {
        console.error(`[cron/iris-checkbacks] Failed for lead ${lead.id}:`, err);
        results.push({ leadId: lead.id, triggered: false, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      processed: leads.length,
      results,
    });
  } catch (err) {
    console.error('[cron/iris-checkbacks] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}