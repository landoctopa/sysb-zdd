// app/page.tsx
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Brain,
  Kanban,
  FileText,
  Zap,
  ArrowRight,
  Sparkles,
  Smile,
  ShieldCheck,
  Star,
  AlertCircle
} from 'lucide-react';
import SalesReadinessAudit from '@/components/landing/SalesReadinessAudit';

export const metadata = {
  title: 'ZDD – AI‑Powered Sales Readiness & Intent Radar',
  description: 'Built for small business owners and solopreneurs to turn market noise into closed contracts without cold-calling stress.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="bg-background text-foreground min-h-screen">
      
      {/* ── Friendly, Non-Corporate Hero Section ── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Subtle cyan radial gradient matching original theme blueprint */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(100,255,218,0.08),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <Badge variant="outline" className="gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3 w-3 fill-current" /> Public Beta · Built for Small Business Owners & Solopreneurs
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-none">
              B2B sales doesn't have to feel like a{' '}
              <span className="text-primary">second full-time job</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              You are amazing at your craft, but tracking down clients manually takes hours. ZDD monitors corporate news, funding milestones, and regional market expansion triggers, then drafts exactly who to message and what to say—so you can land meetings without sounding salesy.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all">
                  <Link href="/leads">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all">
                  <Link href="/login">Claim 50 Free Leads</Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild className="h-12 rounded-full px-8 font-semibold border-border/60 text-foreground hover:bg-muted/10">
                <Link href="/signals">Browse Live Opportunities</Link>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              No credit card required · Free to test your first 50 matched business updates
            </p>
          </div>
        </div>
      </section>

      {/* ── Dynamic Audit Hook Canvas Area (Replaced legacy DemoMatch component block) ── */}
      <SalesReadinessAudit />

      {/* ── Problem Layout Statement Section ── */}
      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Why traditional prospecting feels completely broken for small teams
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              When you wear every single hat in your company, cold sales methods just waste your valuable delivery time.
            </p>
          </div>
          
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Hours lost to blind digging',
                desc: 'Scrolling through news wires, feeds, and job posts looking for client indicators is exhausting. You end up spending more time hunting for projects than actually producing your best work.',
              },
              {
                title: 'You don’t know when to strike',
                desc: 'A cold introductory pitch sent out of the blue gets instantly ignored. To get a response, you need a warm contextual anchor—like a corporate brand raising capital or setting up new regional offices.',
              },
              {
                title: 'Generic corporate copies fail',
                desc: 'Copy-pasting stiff sales templates makes you look like spam. To command attention from a busy founder, your note must look like an honest, direct observation from an experienced peer.',
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

      {/* ── Feature Presentation Panel Section ── */}
      <section className="border-t border-border/40 py-16 md:py-20 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything you need to find clients, simplified
            </h2>
            <p className="text-sm text-muted-foreground">
              No complicated enterprise jargon or software configurations. Just an intelligent, supportive layout that helps you connect with companies who need you.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: 'Live Market Radars',
                desc: 'We watch global news releases, business journals, and public RSS feeds to surface companies launching physical or digital expansion tracks.',
              },
              {
                icon: Brain,
                title: 'Instant Client Briefings',
                desc: 'One click compiles a clean strategic dossier profile—summarizing exactly what they sell, their expansion triggers, and why they need your service.',
              },
              {
                icon: Kanban,
                title: 'Visual Lead Workbenches',
                desc: 'A simple, visual step board to track your active outreach threads, update statuses, and move conversations forward at your own comfortable pace.',
              },
              {
                icon: FileText,
                title: 'Iris Message Assistant',
                desc: 'Get brief introductory text variations for Email or LinkedIn written entirely based on your target contact’s history notes. No corporate fluff allowed.',
              },
              {
                icon: Sparkles,
                title: 'Central Client Lockers',
                desc: 'Keep all your foundational research notes, prospective profile contacts, conversation timelines, and task logs attached on a single structured screen.',
              },
              {
                icon: Smile,
                title: 'Sales-Readiness Guardrails',
                desc: 'Friendly, step-by-step checklist validation steps to ensure your website assets and profile layout link hooks look clean before you start reaching out.',
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

      {/* ── Social Proof & Testimonial Workspace Section ── */}
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
                quote: '“I don’t have a sales background, but Iris caught a brand that just closed funding. The brief gave me the perfect insight to draft an honest, short note, and they booked a call with my studio that evening.”',
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

      {/* ── Deep Space Floating Footer CTA Section ── */}
      <section className="border-t border-border/40 py-16 md:py-24 relative overflow-hidden bg-card/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(40%_50%_at_50%_50%,rgba(100,255,218,0.05),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start finding your next project challenge today
            </h2>
            <p className="max-w-xl mx-auto text-base text-muted-foreground">
              Get full access to your signal feed streams and your first 50 research leads completely on us. No hidden credit card commitments.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                  <Link href="/leads">Open Your Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                  <Link href="/login">Launch Your Free Dashboard</Link>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Have a quick question about how we parse updates? Say hello directly at{' '}
              <Link href="mailto:hello@z-dd.com" className="underline text-primary hover:text-primary-foreground transition-colors">
                hello@z-dd.com
              </Link>
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}