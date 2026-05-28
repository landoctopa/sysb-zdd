'use client';

// app/components/leads/LeadStoreHydrator.tsx
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead, $activeContacts, $activeTasks, $activeCoachLogs, $activeCommunications } from '@/store/leadsStore';
import { $profile } from '@/store/profileStore';
import type { LeadRow, ContactRow, TaskRow, CoachLogRow, CommunicationRow } from '@/store/leadsStore';
import type { ProfileRow } from '@/store/profileStore';

interface Props {
  activeLead: LeadRow;
  contacts: ContactRow[];
  tasks: TaskRow[];
  coachLogs: CoachLogRow[];
  communications?: CommunicationRow[];
  userProfile?: ProfileRow;
  children?: React.ReactNode;
}

export default function LeadStoreHydrator({ activeLead, contacts, tasks, coachLogs, communications = [], userProfile, children }: Props) {
  // Set atoms on mount and when props change
  useEffect(() => {
    $activeLead.set(activeLead);
    $activeContacts.set(contacts);
    $activeTasks.set(tasks);
    $activeCoachLogs.set(coachLogs);
    $activeCommunications.set(communications);
    if (userProfile) $profile.set(userProfile);
  }, [activeLead, contacts, tasks, coachLogs, communications, userProfile]);

  return <>{children}</>;
}