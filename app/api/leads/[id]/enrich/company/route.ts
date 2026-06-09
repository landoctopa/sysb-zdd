// app/api/leads/[id]/enrich/company/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApifyClient } from 'apify-client';

// 🛠️ Typings matching harvestapi/linkedin-company output schema shape
interface LinkedinCompanyPayload {
  linkedinUrl?: string;
  website?: string;
  name?: string;
  universalName?: string;
  tagline?: string;
  description?: string;
  employeeCount?: number;
  employeeCountRange?: { start?: number };
  followerCount?: number;
  companyType?: string;
  foundedOn?: { year?: number };
  logo?: string;
  specialities?: string[];
  industries?: string[];
  locations?: Array<{
    headquarter?: boolean;
    line1?: string;
    parsed?: {
      text?: string;
      countryCode?: string;
      regionCode?: string | null;
      country?: string;
      countryFull?: string;
      state?: string;
      city?: string;
    };
  }>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: leadId } = await params;
    const { linkedinUrl } = await request.json();

    if (!linkedinUrl) {
      return NextResponse.json({ error: 'A valid LinkedIn company link is required.' }, { status: 400 });
    }

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Validate Membership Tier Guardrail (Pro Only)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_premium) {
      return NextResponse.json(
        { error: 'Pro Membership required to unlock automated LinkedIn profile enrichment.' },
        { status: 403 }
      );
    }

    // 3. Initialize Apify Client using secure env values
    const apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    // 4. Run actor on-demand and fetch results dataset
    const run = await apifyClient.actor("harvestapi/linkedin-company").call({
      companies: [linkedinUrl]
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    // 🛠️ FIX: Explicitly cast the untyped object to our structured interface schema
    const companyProfile = items?.[0] as LinkedinCompanyPayload | undefined;

    if (!companyProfile) {
      return NextResponse.json({ error: 'No public data could be gathered for this profile handle.' }, { status: 404 });
    }

    // 🛠️ FIX: Safely read location arrays through the typed interface engine
    const hqLocation = companyProfile.locations?.find((l) => l.headquarter) || companyProfile.locations?.[0];

    // 5. Pull down current lead object to avoid overwriting user manual values
    const { data: lead } = await supabase
      .from('leads')
      .select('company_details')
      .eq('id', leadId)
      .single();

    const existingDetails = (lead?.company_details as Record<string, any>) || {};

    // 6. Reshape data mapping cleanly with types resolved
    const enrichedPayload = {
      linkedin_url: companyProfile.linkedinUrl || linkedinUrl,
      website: companyProfile.website || null,
      company_name: companyProfile.name || null,
      company_details: {
        ...existingDetails,
        legal_name: companyProfile.universalName || companyProfile.name || null,
        tagline: companyProfile.tagline || null,
        description: companyProfile.description || null,
        employee_count: companyProfile.employeeCount || null,
        employee_count_range_start: companyProfile.employeeCountRange?.start || null,
        follower_count: companyProfile.followerCount || null,
        company_type: companyProfile.companyType || null,
        founded_year: companyProfile.foundedOn?.year || null,
        logo_url: companyProfile.logo || null,
        address: hqLocation?.parsed?.text || hqLocation?.line1 || null,
        specialities: companyProfile.specialities || [],
        all_industries: companyProfile.industries || [],
        is_linkedin_enriched: true,
        enriched_at: new Date().toISOString()
      }
    };

    // 7. Commit patch directly back to your workspace leads schema table row
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(enrichedPayload)
      .eq('id', leadId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedLead);
  } catch (err: any) {
    console.error('[Apify Lead Enrichment Endpoint Exception]:', err);
    return NextResponse.json({ error: err.message || 'Scraper processing exception.' }, { status: 500 });
  }
}