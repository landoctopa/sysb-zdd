import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Brain,
  Kanban,
  FileText,
  Zap,
  Sparkles,
  Smile,
  Star,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import SalesReadinessAudit from '@/components/landing/SalesReadinessAudit';

export const metadata = {
  title: 'ZDD – B2B Sales Setup for Creative Studios & Agencies',
  description: 'Find out exactly how your agency looks to premium buyers, optimize your footprint, and discover high-intent leads.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="bg-background text-foreground min-h-screen">
      
      {/* ── Focused Hero Section ── */}
      <section className="relative overflow-hidden pt-20 pb-12 md:pt-28 md:pb-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(100,255,218,0.08),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <Badge variant="outline" className="gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3 w-3 fill-current" /> Public Beta · Free Presence Assessment Built-In
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-none">
              Most B2B outreach fails before you even click <span className="text-primary">send</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              When a prospective client reads your cold intro note, the first thing they do is scan your website and LinkedIn profile. If your messaging looks like a standard internal resume instead of a client-centric solution workspace, they bounce.
            </p>
            <div className="pt-4 flex flex-col items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Drop your links below to run a direct, plain-English readiness audit instantly:
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Embedded Dynamic Readiness Evaluation Block ── */}
      <SalesReadinessAudit />

      {/* ── Contextual Problem Matrix Breakdown ── */}
      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Why traditional lead generation maps fall short for small teams
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              When you are busy running projects, copying enterprise sales tactics or bulk emailing generic lists burns your brand value.
            </p>
          </div>
          
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Blind prospecting eats up hours',
                desc: 'Spending days digging through corporate feeds or tracking random job postings is exhausting. You end up hunting for work instead of perfecting your core craft.',
              },
              {
                title: 'Missing the ideal window',
                desc: 'Reaching out randomly leads to radio silence. To get a busy brand manager to pause, you need a clear contextual trigger event—like a company raising fresh capital, scaling into new cities, or updating a major product line.',
              },
              {
                title: 'Jargon-filled pitches get buried',
                desc: 'Stiff marketing templates sound fake. To convert a target account, your note has to look like an honest, brief observation from an experienced peer who understands their exact problem space.',
              },
            ].map((item) => (
              <Card key={item.title} className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-primary/80" /> {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Presentation Matrix ── */}
      <section className="border-t border-border/40 py-16 md:py-20 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything you need to talk to premium clients, simplified
            </h2>
            <p className="text-sm text-muted-foreground">
              No complex enterprise configurations. Just an intuitive, supportive radar that helps you land contracts without sounding salesy.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: 'Live Market Radars',
                desc: 'We scan regional press announcements and corporate funding milestones to flag expanding companies right when they need high-impact creative partners.',
              },
              {
                icon: Brain,
                title: 'Instant Customer Briefings',
                desc: 'One click pulls together a clean strategy dossier profile—breaking down what they sell, their current operational growth hurdles, and exactly why they fit your studio profile.',
              },
              {
                icon: Kanban,
                title: 'Visual Lead Workbenches',
                desc: 'A simple visual step board to sort your conversations, update response states, and progress accounts forward at your own comfortable delivery pace.',
              },
              {
                icon: FileText,
                title: 'Iris Copywriter Copilot',
                desc: 'Generate conversational, ultra-brief introductory text variations for Email or LinkedIn written entirely around real trigger context indicators. Zero corporate fluff allowed.',
              },
              {
                icon: Sparkles,
                title: 'Central Account Lockers',
                desc: 'Keep your background research dossier sheets, target recipient profiles, message draft histories, and upcoming checklist steps pinned to a single screen.',
              },
              {
                icon: Smile,
                title: 'Continuous Identity Checking',
                desc: 'Includes straightforward, human-friendly checklist guardrails to help ensure your public portfolio and profile details match corporate standards before you launch outreach lines.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Real results from small studio partners
            </h2>
          </div>
          
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {[
              {
                quote: '“I don’t have a corporate sales background, but Iris caught a brand that just closed funding. The brief gave me the perfect insight to draft an honest, short note, and they booked a call with my studio that evening.”',
                name: 'Priya K.',
                role: 'Independent Brand Designer',
              },
              {
                quote: '“We used to spend hours digging for growth managers on LinkedIn. Now we check the signal dashboard, find an expanding brand, and get a tailored message immediately. It cut our research work from hours to minutes.”',
                name: 'Amit K.',
                role: 'Creative Video Producer',
              },
              {
                quote: '“Finally, a tool that does not treat sales like a complex corporate science experiment. It’s practical, ultra-fast, and helps me maintain a solid project pipeline without hiring a costly agency.”',
                name: 'Rajesh M.',
                role: 'B2B Studio Partner',
              },
            ].map((t, idx) => (
              <Card key={idx} className="border-border/60 bg-card/40 backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-0.5 text-primary"><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /><Star className="h-3 w-3 fill-current" /></div>
                  <p className="text-sm italic text-foreground/90 leading-relaxed font-medium">“{t.quote}”</p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">{t.name[0]}</div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Simplified Bottom CTA ── */}
      <section className="border-t border-border/40 py-16 md:py-20 relative overflow-hidden bg-card/40 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-4">
          <HelpCircle className="h-8 w-8 text-primary mx-auto opacity-80" />
          <h3 className="text-xl font-bold text-foreground">Want to verify your setup before launching signals?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Scroll back up to the profile validator input boxes at the top of the page. Let Iris run an initial diagnostic analysis completely free.
          </p>
        </div>
      </section>

    </div>
  );
}