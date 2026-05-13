'use client';

import { useStore } from '@nanostores/react';
import { $profile } from '@/store/profileStore';
import { User, Zap, CreditCard, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';

export default function SettingsPage() {
  const profile = useStore($profile);
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    {
      label: 'Business Profile',
      icon: User,
      desc: 'Manage company info & pitch',
      link: '/onboarding',
    },
    {
      label: 'Integrations',
      icon: Zap,
      desc: 'Gmail & CRM sync',
      link: '/settings/integrations',
    },
    {
      label: 'Billing',
      icon: CreditCard,
      desc: 'Plan & usage',
      link: '/settings/billing',
    },
    {
      label: 'Security',
      icon: ShieldCheck,
      desc: 'Account access',
      link: '/settings/security',
    },
  ];

  return (
    <PageContainer className="py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile summary card */}
      <div className="bg-muted/30 border border-border/60 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
          {profile?.full_name?.[0] || 'U'}
        </div>
        <div>
          <h2 className="font-semibold text-foreground">
            {profile?.full_name || 'Set up your business'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {profile?.target_sectors?.[0] || 'Add industry in Business Profile'}
          </p>
        </div>
      </div>

      {/* Settings menu */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.link)}
            className="w-full group flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-transparent hover:border-border/60"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-background shadow-sm">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      {/* Sign out button */}
      <Button
        variant="outline"
        onClick={handleSignOut}
        className="w-full h-11 border-rose-200 text-rose-400 hover:bg-rose-50/10 hover:text-rose-300 dark:border-rose-800"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </PageContainer>
  );
}