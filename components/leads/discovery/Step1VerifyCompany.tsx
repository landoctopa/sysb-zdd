'use client';
// components/leads/discovery/Step1VerifyCompany.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Database } from '@/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row']; // 🛠️ FIXED: Pointed to actions table row instead of contacts

interface Step1Props {
  lead: Lead;
  dbTask: Action;
  isSaving: boolean;
  onOpenWidget: () => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step1VerifyCompany({ lead, dbTask, isSaving, onOpenWidget, onCompleteTask }: Step1Props) {
  return (
    <div className="pt-1 px-1 flex flex-wrap gap-2.5">
      <Button 
        type="button" 
        onClick={onOpenWidget}
        className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm"
      >
        {lead.website ? 'Edit details' : 'Add company details'}
      </Button>
      
      {lead.website && (
        <Button 
          type="button" 
          disabled={isSaving} 
          onClick={() => onCompleteTask(dbTask, { verified_domain: 'manual_user_explicit_lock' })} 
          className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700"
        >
          I have completed this task
        </Button>
      )}
    </div>
  );
}