// components/layout/PageFooter.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'ghost' | 'outline';
  icon?: React.ReactNode;
}

interface PageFooterProps {
  actions: Action[];
  className?: string;
}

export function PageFooter({ actions, className = '' }: PageFooterProps) {
  if (actions.length === 0) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-background border border-border/60 rounded-xl shadow-lg p-1.5 flex items-center gap-1 backdrop-blur-sm z-50 ${className}`}>
      {actions.map((action, index) => (
        <React.Fragment key={action.label}>
          {index > 0 && <div className="h-6 w-px bg-border" />}
          <Button
            variant={action.variant || 'ghost'}
            size="sm"
            className="flex-1 h-9 text-sm font-medium rounded-lg"
            onClick={action.onClick}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}