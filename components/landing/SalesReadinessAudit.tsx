'use client';
// components/landing/SalesReadinessAudit.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ShieldCheck, AlertCircle, ArrowRight, Table, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface AuditResult {
  companyName: string;
  intro: string;
  theGood: string[];
  gaps: {
    website: string[];
    linkedin: string[];
  };
  actionPlan: Array<{ priority: string; item: string; action: string }>;
}

export default function SalesReadinessAudit() {
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website.trim()) {
      toast.error('Please enter your website link first.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Iris is evaluating your public presence...');

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, linkedin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit engine processing run failed');

      localStorage.setItem('zdd_onboarding_audit', JSON.stringify({
        website,
        companyName: data.companyName,
        inferredSectors: data.inferredSectors || [],
        inferredCountries: data.inferredCountries || [],
        inferredEventCategories: data.inferredEventCategories || []
      }));

      setResult(data);
      toast.success('Your sales-readiness audit is ready!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAudit = () => {
    setResult(null);
    setWebsite('');
    setLinkedin('');
  };

  return (
    <section id="audit-bench" className="py-12 md:py-16 border-t border-b border-border/40 bg-secondary/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Form Entry State Box wrapper */}
        {!result ? (
          <div className="max-w-xl mx-auto bg-card border border-border/60 shadow-xl rounded-xl p-5 sm:p-6 animate-fadeIn">
            <div className="text-center pb-4 space-y-1 border-b border-border/20 mb-4">
              <h3 className="font-bold text-base text-foreground">Run a Free Sales-Readiness Diagnostic</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Let Iris scan your current business presentation to point out potential buyer hurdles.</p>
            </div>
            
            <form onSubmit={handleRunAudit} className="space-y-4 text-xs font-semibold text-muted-foreground">
              <div className="space-y-1.5">
                <label className="block select-none text-foreground">Your Studio or Business Website</label>
                <input 
                  type="text"
                  placeholder="e.g., avakkai.studio or https://mycompany.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs px-3 h-10 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium transition-colors"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block select-none text-muted-foreground/70">Your LinkedIn Profile or Page (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., linkedin.com/in/ajay-creative"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs px-3 h-10 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium transition-colors"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !website.trim()}
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-1.5 rounded-lg shadow-sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? 'Iris is reviewing your website layers...' : 'Analyze My Presence Setup'}
              </Button>
            </form>
          </div>
        ) : (
          /* Reset navigation handler block displayed when the form is hidden */
          <div className="flex justify-center animate-fadeIn mb-2">
            <button
              type="button"
              onClick={handleResetAudit}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:underline bg-card border border-border/60 px-4 py-2 rounded-full shadow-sm transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Analyze a Different Portfolio Link
            </button>
          </div>
        )}

        {/* Structured Dashboard Blueprint Output Panel */}
        {result && (
          <div className="mt-6 bg-card border-2 border-primary/40 shadow-2xl rounded-xl p-6 sm:p-8 text-xs text-foreground space-y-6 animate-fadeIn max-w-4xl mx-auto">
            
            <div className="border-b border-border/40 pb-4">
              <span className="bg-primary text-primary-foreground font-mono text-[9px] uppercase px-2 py-0.5 rounded font-black tracking-wider">Evaluation Report: {result.companyName || 'Your Business'}</span>
              <p className="mt-3 text-sm font-semibold text-muted-foreground leading-relaxed italic">
                "{result.intro}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-primary text-[11px] uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Your Authority Strengths
                </h4>
                <ul className="space-y-2 font-medium text-muted-foreground leading-relaxed list-disc pl-4">
                  {result.theGood.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-destructive text-[11px] uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <AlertCircle className="h-4 w-4 text-destructive" /> Conversion Roadblocks Found
                </h4>
                <div className="space-y-2.5 font-medium text-muted-foreground leading-relaxed">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-foreground/50 block mb-0.5">Website Hurdles</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {result.gaps.website.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-foreground/50 block mb-0.5">LinkedIn Flaws</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {result.gaps.linkedin.map((l, idx) => <li key={idx}>{l}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            <div className="space-y-3 bg-background p-4 rounded-xl border border-border/40">
              <h4 className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Table className="h-4 w-4 text-primary" /> Prioritized Action Roadmap
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-medium text-muted-foreground">
                  <thead>
                    <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="pb-2 w-1/4">Timeline</th>
                      <th className="pb-2 w-1/3">Action Item</th>
                      <th className="pb-2">What to Do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-[11px]">
                    {result.actionPlan.map((step, idx) => (
                      <tr key={idx} className="hover:bg-card/50">
                        <td className="py-2.5 font-bold text-foreground align-top pr-2">{step.priority}</td>
                        <td className="py-2.5 font-bold text-primary align-top pr-2">{step.item}</td>
                        <td className="py-2.5 text-muted-foreground leading-relaxed align-top">{step.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Main Action Loop Handoff Hook */}
            <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-bold text-foreground text-sm">Ready to fix these gaps and turn signals into meetings?</p>
                <p className="text-[11px] font-medium text-muted-foreground">Claim your account to auto-populate your profile using these assessment metrics.</p>
              </div>
              <Button asChild className="h-10 px-5 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1 shadow-sm shrink-0">
                <Link href="/login">Claim My Free Account <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}