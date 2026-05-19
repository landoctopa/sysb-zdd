'use client';

// components/leads/LeadsListHydrator.tsx
import { useEffect } from 'react';
import { $leadsList } from '@/store/leadsStore';
import type { LeadRow } from '@/store/leadsStore';

interface LeadsListHydratorProps {
  leads: LeadRow[];
}

export default function LeadsListHydrator({ leads }: { leads: LeadRow[] }) {
  useEffect(() => {
    // Sets the global array list atom directly upon server mount
    $leadsList.set(leads);
  }, [leads]);

  return null;
}