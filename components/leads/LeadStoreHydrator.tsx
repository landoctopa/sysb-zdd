'use client';

import { useEffect } from 'react';
import { 
  $leadsList, 
  $activeLead, 
  $activeContacts, 
  $activeTasks, 
  $activeCoachLogs 
} from '@/store/leadsStore';

interface HydratorProps {
  leads?: any[];
  activeLead?: any;
  contacts?: any[];
  tasks?: any[];
  coachLogs?: any[];
}

export default function LeadStoreHydrator({ 
  leads, 
  activeLead, 
  contacts, 
  tasks, 
  coachLogs 
}: HydratorProps) {
  
  // We use a simple effect to sync server data to the client store on mount/update
  useEffect(() => {
    if (leads) $leadsList.set(leads);
    if (activeLead) $activeLead.set(activeLead);
    if (contacts) $activeContacts.set(contacts);
    if (tasks) $activeTasks.set(tasks);
    if (coachLogs) $activeCoachLogs.set(coachLogs);
  }, [leads, activeLead, contacts, tasks, coachLogs]);

  return null; // This component renders nothing, it just manages data
}