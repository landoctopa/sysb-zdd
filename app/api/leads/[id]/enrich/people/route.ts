// app/api/leads/[id]/enrich/people/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApifyClient } from 'apify-client';

// Core target keywords used to catch leadership and decision-making roles
const MANAGEMENT_KEYWORDS = [
  'founder', 'ceo', 'vp', 'vice president', 'director', 'head of', 
  'chief', 'partner', 'manager', 'lead', 'producer', 'creative director'
];

interface ApifyEmployeePayload {
  id?: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  photo?: string;
  experience?: Array<{
    position?: string;
    companyName?: string;
    companyLinkedinUrl?: string;
  }>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: leadId } = await params;
    const { companyLinkedinUrl, maxItems = 50 } = await request.json();

    if (!companyLinkedinUrl) {
      return NextResponse.json({ error: 'Company LinkedIn URL context is required.' }, { status: 400 });
    }

    // 1. Verify Authentication Session Status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Enforce Pro Membership Tier Guardrail
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json(
        { error: 'Pro Membership required to run automated background stakeholder lookups.' },
        { status: 403 }
      );
    }

    // 3. Dispatch Background Client Scraper Calls to Apify
    const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    
    const run = await apifyClient.actor("harvestapi/linkedin-company-employees").call({
      maxItems: maxItems,
      companies: [companyLinkedinUrl]
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const rawEmployees = items as ApifyEmployeePayload[];

    // 4. Filtering Engine: Run keyword matching on headers and current positions
    const managementRoster = rawEmployees.map(emp => {
      const headlineStr = (emp.headline || '').toLowerCase();
      const currentPos = emp.experience?.[0]?.position || '';
      const currentPosStr = currentPos.toLowerCase();

      // Calculate priority match ranking score
      let formsMatch = false;
      let score = 0;

      MANAGEMENT_KEYWORDS.forEach(keyword => {
        if (headlineStr.includes(keyword) || currentPosStr.includes(keyword)) {
          formsMatch = true;
          score += 1;
        }
      });

      // Standardize payload shape to simplify form collection tasks later
      return {
        id: emp.id || emp.linkedinUrl?.split('/in/')?.[1] || Math.random().toString(),
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        role: currentPos || emp.headline || 'Team Member',
        linkedin_url: emp.linkedinUrl || null,
        photo_url: emp.photo || null,
        isManagementMaterial: formsMatch,
        rankScore: score
      };
    })
    // Filter out non-management entries and sort by priority ranking score
    .filter(emp => emp.isManagementMaterial)
    .sort((a, b) => b.rankScore - a.rankScore);

    return NextResponse.json({ employees: managementRoster });
  } catch (err: any) {
    console.error('[Enrich People Route Exception Handler]:', err);
    return NextResponse.json({ error: err.message || 'Scraper array distribution failure.' }, { status: 500 });
  }
}