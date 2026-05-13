// components/layout/AppLayout.tsx
'use client';

import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className = '' }: AppLayoutProps) {
  return (
    <div className={`flex flex-col min-h-screen bg-background ${className}`}>
      {children}
    </div>
  );
}