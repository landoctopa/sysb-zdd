# Developing Lead Feature in my Sales App
## Context
I am developing sales management app (nextjs/supabase) for solopreneurs and small businesses who are operating  b2b businesses. Way i have structured the app flow is as follows -> 
1. News feed and data from apis in raw_signals table in supabase. 
2. We match raw_signals with user's business profile and ICP and show them the inbox at route "/signals/page.tsx". 
3. When user clicks on a signal it opens "/signals/[id]/pages.tsx" where i provided user with more information (through deepseek) about the signal and show them analysis using AI and store the contextual ai generated reaserch in user_signals table, user can take two actions
    - promote the signal as lead which creates new row in leads tables and copies over relevant details from user_signals, set signal_status in user_signals to "promoted"
    - dismiss the lead - set signal_status in user_signals to "dismissed"
4. lead is seen in "/leads/page" where users can manage it through till conversion

## Instruction
1. Understand the current code and evaluate it against my desired outcomes
2. Ask me for any further clarifications and details before implementing
3. implement one thing at a time so i can test it before we move ahead
4. you are free to suggest a completely different approach to each feature inside leads. this new new way of organizing data, related table, new component etc.
5. try to keep styling as it is gloabl.css
6. I have added how i think of leads below
7. i will provide all the relevant app context
8. try to keep implmentation simple, logical and scalable. remember all the execution (sending mails, campaign, making presentation happens on other platform)

## How I think about Managing leads
1. key value of what i am building comes from the way users can see and manage leads, and we provide contextual insight/nudge at every stage
3. We will have a lead orchestrator "iris" (with deepseek integration) which will guide users through lead based on current stage. We will need to define preset action for every stage of the lead and iris can ochestrate, asking for data, nudging user to send email, contact, research, provide insight and research etc.
4. Lead stages with interventions that would be required from the iris
    1. Lead Generation / Acquisition - Already done through signals
    2. Lead Qualification -
        - Goal: Determine if the lead business & target customer profile, and if they have a genuine need.
        - iris role: Dynamic scoring, Sales cycle estimation, Next-best-action,
        Churn/exit prediction, Budget range, decision-making authority, urgency signals, provide research based on signal
        - Activities: Qualification, Sales development, outreach, find decision makers
        - Information required: ICP (from profile table)
    3. Lead Nurturing (for not-yet-ready leads)
        - goal: Keep leads warm until they are sales-ready.
        - Activities:
            1. Drip email campaigns with educational content (app/iris recommend approach does not execute)
            2. Retargeting ads (app/iris recommend approach does not execute)
            3. Share case studies, whitepapers, product demos (app/iris generates and gives direction for futher research)
            4. Periodic check-ins (low touch) (app/iris check through presets, AI generation not required)
        - Information -  users will have provide this manually, when iris check in. W ehave to figure out how
            1. Lead’s expressed interests and content preferences
            2. Engagement history (what they’ve clicked or ignored)
            3. Sales cycle stage estimate (e.g., still researching)
    4. Proposal: this should happen only after lead contact asks for proposal, we have to ask user through iris if that happens then we should change stage to proposal
        - goal - Deliver a compelling, tailored proposal or pitch.
        - activities 
            1. Create custom proposal, quote, or SOW (statement of work)
            2. Schedule presentation with decision-makers
            3. Address objections
            4. Share ROI analysis
        - Information required - 
            1. Pricing model (one-time, subscription, usage-based)
            2. Lead’s specific requirements and success metrics
            3. Approval workflow within lead’s company
        - iris role- iris should prompt user to provide information which is not present in leads table or in profile
            1. Draft proposal & key selling points – generate first version based on ICP and lead’s inputs
            2. ROI calculator – auto-populate with industry benchmarks and lead’s data
            3. Objection handler – suggest responses to common objections seen in similar deals
            4. Competitive battle cards – retrieve winning arguments against specific competitors
            5. Email/presentation generation and refinement – rephrase for clarity, urgency, or persuasion
    5. Negotiation & Closing
        - goal: Agree on terms and close the deal.
        - iris role: provide negotiations playbook
    6. Conversion (Closed-Won)
        - goal - Officially  a customer.
        - activities
            1. Mark opportunity as Closed-Won
            2. generate summary


## Code and Files

1. app/leads/page.tsx
```tsx
// app/leads/page.tsx
import { createClient } from '@/utils/supabase/server';
import LeadStoreHydrator from '@/components/leads/LeadStoreHydrator';
import PipelineView from './PipelineView';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, status, hotness_score, deal_timeline, lead_category, created_at')
    .order('hotness_score', { ascending: false });

  return (
    <PageContainer className="py-6 md:py-8">
      <LeadStoreHydrator leads={leads || []} />
      <PipelineView />
    </PageContainer>
  );
}
```

2. app/leads/PipelineView.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $leadsList } from '@/store/leadsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Clock,
  Building2,
  Users,
  FileText,
  Handshake,
  Target,
  CheckCircle2,
  Plus,
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  List,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Database } from '../../database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

const STAGE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  new: {
    label: 'New',
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  contacted: {
    label: 'Contacted',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  proposal: {
    label: 'Proposal',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  negotiation: {
    label: 'Negotiation',
    icon: Handshake,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  won: {
    label: 'Won',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

const getLeadCategoryStyle = (category: string | null) => {
  const styles: Record<string, string> = {
    'Strategic Lead':
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Target Account':
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Existing Customer':
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Partner: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return category
    ? styles[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    : 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const getHotnessColor = (score: number | null) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

export default function PipelineView() {
  const leads = useStore($leadsList);
  const [selectedStage, setSelectedStage] = useState<string>('new');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  const stages = ['new', 'contacted', 'proposal', 'negotiation', 'won'];

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.status === stage);
  };

  const getStageCount = (stage: string) => {
    return leads.filter((lead) => lead.status === stage).length;
  };

  const totalLeads = leads.length;
  const wonLeads = getLeadsByStage('won').length;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  if (leads.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your sales opportunities
            </p>
          </div>
          <Button className="shadow-sm gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>

        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Import opportunities from signals or create a new lead manually.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="outline" asChild>
              <Link href="/signals">Browse Signals</Link>
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Lead
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track deal progress and manage your sales workflow
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 gap-1"
              onClick={() => setViewMode('pipeline')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 gap-1"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>

          <Button className="shadow-sm gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total Leads
            </p>
            <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Active Opportunities
            </p>
            <p className="text-2xl font-bold text-foreground">
              {totalLeads - wonLeads}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Won Deals
            </p>
            <p className="text-2xl font-bold text-emerald-400">{wonLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Conversion Rate
            </p>
            <p className="text-2xl font-bold text-foreground">
              {conversionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' ? (
        <>
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {stages.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const Icon = config.icon;
                const count = getStageCount(stage);
                const isActive = selectedStage === stage;

                return (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                      isActive
                        ? `${config.bgColor} border-primary/50 shadow-sm`
                        : 'bg-background border-border/60 hover:border-primary/30'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? config.color : 'text-muted-foreground'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium capitalize ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {config.label}
                    </span>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="ml-1 h-5 min-w-[20px] px-1 text-[10px]"
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {getLeadsByStage(selectedStage).length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  No leads in {STAGE_CONFIG[selectedStage]?.label.toLowerCase()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedStage === 'new'
                    ? 'Add leads from signals or create a new opportunity to get started.'
                    : `Move leads to ${STAGE_CONFIG[selectedStage]?.label.toLowerCase()} as you progress through the sales cycle.`}
                </p>
              </div>
            ) : (
              getLeadsByStage(selectedStage).map((lead) => (
                <Link
                  href={`/leads/${lead.id}`}
                  key={lead.id}
                  className="block group"
                >
                  <Card className="border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {lead.lead_category && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2 py-0.5 ${getLeadCategoryStyle(
                                  lead.lead_category
                                )}`}
                              >
                                {lead.lead_category}
                              </Badge>
                            )}
                            <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2 flex-1">
                              {lead.company_name || 'Untitled Lead'}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span
                              className={`flex items-center gap-1.5 font-medium ${getHotnessColor(
                                lead.hotness_score
                              )}`}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              {lead.hotness_score || 0}% Fit
                            </span>
                            {lead.deal_timeline && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {lead.deal_timeline}
                              </span>
                            )}
                            {lead.created_at && (
                              <span className="flex items-center gap-1.5 text-[11px]">
                                Added{' '}
                                {new Date(lead.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
                          <Badge
                            className={`${
                              STAGE_CONFIG[lead.status || 'new']?.bgColor
                            } text-[10px] font-medium px-2 py-1 capitalize`}
                          >
                            {STAGE_CONFIG[lead.status || 'new']?.label ||
                              lead.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {totalLeads} total leads
            </p>
            <Button variant="ghost" size="sm" className="gap-1">
              Sort by <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {leads.map((lead) => (
            <Link
              href={`/leads/${lead.id}`}
              key={lead.id}
              className="block group"
            >
              <Card className="border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {lead.lead_category && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${getLeadCategoryStyle(
                              lead.lead_category
                            )}`}
                          >
                            {lead.lead_category}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-base text-foreground">
                          {lead.company_name || 'Untitled Lead'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span
                          className={`flex items-center gap-1.5 ${getHotnessColor(
                            lead.hotness_score
                          )}`}
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          {lead.hotness_score || 0}% Fit
                        </span>
                        {lead.deal_timeline && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {lead.deal_timeline}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        className={`${
                          STAGE_CONFIG[lead.status || 'new']?.bgColor
                        } text-[10px] font-medium px-2 py-1 capitalize whitespace-nowrap`}
                      >
                        {STAGE_CONFIG[lead.status || 'new']?.label ||
                          lead.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

```

3. app/leads/[id]/page.tsx (file attached)
4. app/leads/[id]/WorkbenchHeader.tsx (file attached)
5. app/leads/[id]/StrategyCard.tsx (file attached)
6. app/leads/[id]/ContactsManager.tsx (file attached)
7. app/leads/[id]/AICoachSection.tsx (file attached)
8. app/leads/[id]/AddContactModal.tsx (file attached)
9. app/leads/[id]/ActivityFeed.tsx (file attached)
10. database.types.ts (file attached)
11. app/globals.css (file attached)
12. utils/constants.ts (file attached)
13. app/api/leads/[id]/coach/route.ts (file attached)

## Clarifications I Need Before Proceeding
**How autonomous should Iris be?**
- iris does not execute anything on user behalf but points user to carry out an action. At least till this atage

Lead nurturing stage
- contacted is good, it is essentially the nurturing stage, we can do mix of AI generated and manual. 
- we can predefine steps/action Ai shoul do in the step and some can be manual like checkin with user if they got response from contact. if they do hear then ai can ask user to copy the response and ai can interpret it and suggest user a response to the contact. i wany iris to work within the predifined steps so that we dont end up with conflict between app and iris. 
- I would go for simpler rather than complex implementation at this point. we are in MVP stage of the product

Missing information – For proposal/negotiation, you mentioned prompting the user to provide data not in the lead table (pricing model, specific requirements, approval workflow).
- we can create new table if managing it inside lead becomes too much

Dynamic scoring 
- lets not do dynamic scoring for now we will not have so much information as everything is happening outside and user self reports the progress

Proposal generation 
- Ai should generate main point for proposal with clear section and talking points. not the document itself. 

Integrations – 
- right now prefilled links are fine

User feedback loop – 
- Iris should create task at every stage and user should mark them completed. if its not complete then iris can check in


## Notes when we begin implementation lets do one file at a time. i have also added code for stores which our lead feature will depend henavily on. You are free to rewrite everything and suggest new tables 