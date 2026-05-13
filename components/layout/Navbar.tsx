'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/signals', label: 'Signals' },
    { href: '/leads', label: 'Leads' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <PageContainer>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-primary">ZDD</span>
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline-block">
              Business System
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {user && navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                Sign Out
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-primary text-background hover:bg-primary/80">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none md:hidden"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </PageContainer>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col space-y-3">
            {user && navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSignOut();
                  setIsOpen(false);
                }}
                className="w-full justify-start border-primary/30 text-primary"
              >
                Sign Out
              </Button>
            ) : (
              <Button asChild size="sm" className="w-full justify-start bg-primary text-background">
                <Link href="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}