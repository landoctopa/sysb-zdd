'use client';
// app/onboarding/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { $profile } from '@/store/profileStore';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SECTORS, SECTOR_LABELS, EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from '@/utils/constants';
import { toast } from 'sonner';
import { Sparkles, Check, Globe, Target, Building2, ArrowRight } from 'lucide-react';

// Flat territorial dictionary mapping standard lowercase ISO references natively
const COUNTRY_OPTIONS = [
  { code: 'in', label: 'India' },
  { code: 'us', label: 'United States' },
  { code: 'ae', label: 'United Arab Emirates' },
  { code: 'sg', label: 'Singapore' },
  { code: 'gb', label: 'United Kingdom' }
];

export default function OnboardingPage() {
  const profile = useStore($profile);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  
  // Array tracking matrices initialized clean or populated from local caching structures
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [icpNotes, setIcpNotes] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zdd_onboarding_audit');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setBusinessName(parsed.companyName);
        if (parsed.website) setWebsiteUrl(parsed.website);
        if (parsed.inferredSectors) setSelectedSectors(parsed.inferredSectors);
        if (parsed.inferredCountries) setSelectedCountries(parsed.inferredCountries);
        if (parsed.inferredEventCategories) setSelectedEvents(parsed.inferredEventCategories);
      }
    } catch (err) {
      console.error('Failed to parse onboarding audit profile backup cache.', err);
    }
  }, []);

  const toggleSelection = (id: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active account user session found.');

      const payload = {
        full_name: businessName,
        website: websiteUrl,
        description: description,
        target_sectors: selectedSectors,
        target_countries: selectedCountries,
        target_event_categories: selectedEvents,
        ideal_customer_profile: icpNotes.trim() ? { summary: icpNotes } : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        $profile.set({ ...profile, ...payload });
      }

      localStorage.removeItem('zdd_onboarding_audit');
      
      toast.success('Your account is set up! Loading your real-time signal feed...');
      router.push('/leads');
    } catch (err: any) {
      toast.error(err.message || 'Could not verify database account updates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground font-sans">
      <Card className="w-full max-w-2xl border-border/60 bg-card/90 backdrop-blur-sm shadow-xl rounded-xl">
        
        <CardHeader className="text-center space-y-1.5 pt-6 pb-4 border-b border-border/20">
          <span className="text-[9px] font-mono tracking-widest font-black uppercase text-primary">
            Step {step} of 2 — Onboarding Wizard
          </span>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {step === 1 ? 'Verify Your Corporate Profile' : 'Configure Your Real-Time Filters'}
          </CardTitle>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {step === 1 
              ? "Confirm or adjust what Iris noted down from your website scan." 
              : "Select the industries, locations, and buying triggers you want to catch."}
          </p>
        </CardHeader>

        <CardContent className="pt-6 pb-6">
          
          {/* STEP 1: VALUES ASSIGNMENT PANEL */}
          {step === 1 && (
            <div className="space-y-4 text-xs font-semibold text-muted-foreground">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-foreground">Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Avakkai Studio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs px-3 h-10 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-foreground">Website Domain</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., avakkai.studio"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs px-3 h-10 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-foreground">Your Core Value Proposition / Pitch</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain what makes your service unique. Iris reads this description to write highly custom outreach context cards later..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs p-3 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium resize-none leading-relaxed"
                />
              </div>

              <Button
                type="button"
                disabled={!businessName || !websiteUrl || !description}
                onClick={() => setStep(2)}
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold mt-2 rounded-lg"
              >
                Continue to Listening Parameters <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* STEP 2: METRIC MATRIX FILTER TARGETS */}
          {step === 2 && (
            <form onSubmit={handleCompleteSetup} className="space-y-5 text-xs font-semibold text-muted-foreground">
              
              {/* Canonical Industries Selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Target Customer Industries
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-background/40 border border-border/20 rounded-xl">
                  {SECTORS.map((sectorKey) => {
                    const isSelected = selectedSectors.includes(sectorKey);
                    const labelString = SECTOR_LABELS[sectorKey] || sectorKey;
                    return (
                      <button
                        type="button"
                        key={sectorKey}
                        onClick={() => toggleSelection(sectorKey, selectedSectors, setSelectedSectors)}
                        className={`px-2.5 py-1.5 border rounded-lg transition-all text-[10px] font-bold ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                            : 'bg-background border-border/40 text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                        {labelString}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Territory Locations Selection Bar */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Target Territory Geographies
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRY_OPTIONS.map((c) => {
                    const isSelected = selectedCountries.includes(c.code);
                    return (
                      <button
                        type="button"
                        key={c.code}
                        onClick={() => toggleSelection(c.code, selectedCountries, setSelectedCountries)}
                        className={`px-2.5 py-1.5 border rounded-lg transition-all text-[10px] font-bold ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                            : 'bg-background border-border/40 text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Triggers Checklist Selection Grid */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Buying Signals / Trigger Events to Track
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_CATEGORIES.map((eventKey) => {
                    const isSelected = selectedEvents.includes(eventKey);
                    const labelString = EVENT_CATEGORY_LABELS[eventKey] || eventKey;
                    return (
                      <button
                        type="button"
                        key={eventKey}
                        onClick={() => toggleSelection(eventKey, selectedEvents, setSelectedEvents)}
                        className={`px-2.5 py-1.5 border rounded-lg transition-all text-[10px] font-bold ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                            : 'bg-background border-border/40 text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                        {labelString}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supplementary ICP Description Block */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" /> Describe Your Ideal Client In Your Own Words (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Funded lifestyle brands looking to launch regional video ad campaigns in metro markets..."
                  value={icpNotes}
                  onChange={(e) => setIcpNotes(e.target.value)}
                  className="w-full bg-background border border-border/40 text-xs p-2.5 rounded-lg focus:outline-none focus:border-primary/50 text-foreground font-medium resize-none leading-relaxed"
                />
              </div>

              {/* Backing Navigation Button Arrays */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 px-4 rounded-lg border border-border/60 font-bold text-xs text-muted-foreground hover:bg-muted/10 transition-colors bg-background"
                >
                  Back
                </button>
                <Button
                  type="submit"
                  disabled={loading || selectedSectors.length === 0 || selectedCountries.length === 0}
                  className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg shadow"
                >
                  {loading ? 'Configuring Account Parameters...' : 'Activate My AI Signal Dashboard'}
                </Button>
              </div>

            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
}