// components/layout/PageHeader.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actionButton?: React.ReactNode;
  menuButton?: boolean;
  variant?: 'default' | 'detail';
  children?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  backHref, 
  backLabel = 'Back',
  actionButton,
  menuButton = false,
  variant = 'default',
  children 
}: PageHeaderProps) {
  const isDetail = variant === 'detail';

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/60 shrink-0">
      <div className="px-4 md:px-8">
        <div className={`flex items-center justify-between ${isDetail ? 'h-14' : 'h-16'}`}>
          {/* Left Section */}
          <div className="flex items-center gap-2">
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Center Section */}
          <div className="text-center flex-1 px-4">
            {subtitle && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {subtitle}
              </p>
            )}
            {title && (
              <h1 className={`font-semibold truncate ${isDetail ? 'text-sm' : 'text-lg sm:text-xl'}`}>
                {title}
              </h1>
            )}
            {children}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {actionButton}
            {menuButton && (
              <Button variant="ghost" size="sm" className="gap-2">
                <MoreVertical className="h-4 w-4" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}