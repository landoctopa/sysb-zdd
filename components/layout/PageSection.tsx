// components/layout/PageSection.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PageSectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ 
  title, 
  icon, 
  badge, 
  action, 
  children,
  className = '' 
}: PageSectionProps) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {badge}
            </Badge>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}