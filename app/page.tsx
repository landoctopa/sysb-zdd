// app/page.tsx
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Brain,
  Kanban,
  FileText,
  Zap,
  ArrowRight,
  Check,
  BarChart3,
  Users,
  Sparkles,
} from 'lucide-react';
import DemoMatch from '@/components/landing/DemoMatch';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ZDD – AI‑Powered Lead Discovery & Sales Enablement',
  description:
    'ZDD helps solopreneurs and small B2B businesses find high‑intent opportunities, generate AI research dossiers, and close deals faster.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(100,255,218,0.08),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-6 gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
              <Zap className="h-3 w-3" />
              Now in Public Beta
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Turn market noise into{' '}
              <span className="text-primary">revenue</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ZDD discovers buying signals hidden in news, events, and
              regulatory changes, then equips you with AI‑powered research so you
              can reach out at the perfect moment — before your competitors even
              know the opportunity exists.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold shadow-lg">
                  <Link href="/leads">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold shadow-lg">
                  <Link href="/login">Start Free Trial</Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild className="h-12 rounded-full px-8 font-semibold">
                <Link href="/signals">See Signal Feed</Link>
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              No credit card required · Free for your first 50 leads
            </p>
          </div>
        </div>
      </section>

      <DemoMatch />

      {/* ── The Problem ── */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              You’re missing deals that are right in front of you
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every day, companies announce funding, hire leaders, expand into
              new markets, or face regulatory changes. These are buying signals —
              but they get lost in the noise. By the time you find them manually,
              your competitor has already closed the deal.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Information overload',
                desc: 'Too many feeds, newsletters, and alerts. You spend hours scrolling, not selling.',
              },
              {
                title: 'No context',
                desc: 'A news headline doesn’t tell you why the company needs your service — or when to reach out.',
              },
              {
                title: 'Slow follow‑up',
                desc: 'Manual research takes days. Speed matters when the trigger event is fresh.',
              },
            ].map((item) => (
              <Card key={item.title} className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything you need to close smarter
            </h2>
            <p className="mt-4 text-muted-foreground">
              From signal discovery to deal‑ready research — all in one
              lightweight platform that fits into your existing workflow.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: 'Lead Discovery',
                desc: 'We monitor global news, RSS feeds, and regulatory filings to surface high‑intent signals matched to your ICP.',
              },
              {
                icon: Brain,
                title: 'AI‑Assisted Research',
                desc: 'One click generates a strategic dossier — company analysis, sales triggers, hurdles, and a ready‑to‑use justification.',
              },
              {
                icon: Kanban,
                title: 'Lead Management',
                desc: 'A simple, visual workbench to triage, prioritise, and progress every opportunity.',
              },
              {
                icon: FileText,
                title: 'Sales Enablement',
                desc: 'AI‑crafted talking points and proposal outlines that you can personalise in seconds.',
              },
              {
                icon: Sparkles,
                title: 'Lead Workbench',
                desc: 'All your research, contacts, and communication history in one place — never lose context again.',
              },
              {
                icon: Users,
                title: 'Integrations',
                desc: 'Works with your calendar, email, and the tools you already use — no rip‑and‑replace.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              From signal to deal in three steps
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Discover',
                desc: 'ZDD continuously scans global events and matches them against your ideal customer profile.',
              },
              {
                step: '02',
                title: 'Research',
                desc: 'AI generates a complete strategic dossier — so you understand the opportunity before you reach out.',
              },
              {
                step: '03',
                title: 'Close',
                desc: 'Use the workbench to manage conversations, track progress, and convert signals into revenue.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-bold">{item.step}</span>
                </div>
                <p className="mt-4 text-lg font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof (placeholder) ── */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trusted by forward‑thinking teams
            </h2>
            <p className="mt-4 text-muted-foreground">
              Solopreneurs and small businesses use ZDD to find their next big
              client.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: '“ZDD helped me land a client I would have never found on my own. The research dossier gave me the confidence to reach out the same day.”',
                name: 'Priya K.',
                role: 'Independent Consultant',
              },
              {
                quote: '“We reduced our lead research time from 3 hours to 15 minutes. The AI insights are surprisingly good — it’s like having an analyst on the team.”',
                name: 'Amit & Co.',
                role: 'B2B Agency',
              },
              {
                quote: '“Finally, a tool that understands how small teams actually work. Lightweight, fast, and incredibly useful.”',
                name: 'Rajesh M.',
                role: 'SaaS Founder',
              },
            ].map((t) => (
              <Card key={t.name} className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-sm italic text-foreground/80">{t.quote}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Start finding your next client today
            </h2>
            <p className="mt-4 text-muted-foreground">
              Free for your first 50 leads. No credit card, no setup fees.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold shadow-lg">
                  <Link href="/leads">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="h-12 rounded-full px-8 font-semibold shadow-lg">
                  <Link href="/login">Start Free Trial</Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild className="h-12 rounded-full px-8 font-semibold">
                <Link href="/signals">Explore Live Signals</Link>
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Questions? <Link href="mailto:hello@z-dd.com" className="underline underline-offset-2">hello@z-dd.com</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}