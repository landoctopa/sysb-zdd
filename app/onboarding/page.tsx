'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { $profile } from '@/store/profileStore';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const profile = useStore($profile);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    industry_text: '',
    description: '',
  });

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          description: formData.description,
          target_sectors: [formData.industry_text],
        })
        .eq('id', user.id);

      if (error) throw error;

      $profile.set({
        ...profile!,
        full_name: formData.full_name,
        description: formData.description,
        target_sectors: [formData.industry_text],
      });

      toast.success('Profile updated');
      router.push('/leads');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center space-y-2 pt-8 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Complete Your Profile
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tell us about your business to personalize insights
          </p>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Business name
                </label>
                <input
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., Avakkai Solutions"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary industry
                </label>
                <input
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g., Fintech, SaaS, E-commerce"
                  value={formData.industry_text}
                  onChange={(e) =>
                    setFormData({ ...formData, industry_text: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Business USP / Pitch
                </label>
                <textarea
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="What makes your solution unique? (used by AI Coach for outreach)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full h-11 font-semibold"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}