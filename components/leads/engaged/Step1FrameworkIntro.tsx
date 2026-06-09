'use client';
// components/leads/engaged/Step1FrameworkIntro.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Database } from '@/database.types';

interface Step1Props {
  dbTask: Database['public']['Tables']['actions']['Row'];
  isSaving: boolean;
  onCompleteTask: (task: any, meta?: Record<string, any>) => void;
}

export default function Step1FrameworkIntro({ dbTask, isSaving, onCompleteTask }: Step1Props) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm max-w-2xl">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 select-none">
          <BookOpen className="h-4 w-4 text-blue-600" /> Consultative Meeting Strategy Essentials
        </h4>
        <p className="text-slate-600 font-medium leading-relaxed">
          The exact goal of this stage is to get a **Yes for a phone or face-to-face meeting**, not explaining your whole business profile. Giving away all information via text strings allows busy clients to draw wrong conclusions and ignore you.
        </p>
        
        {/* Dynamic educational playbook asset article link */}
        <div className="p-3 bg-blue-500/5 border border-dashed border-blue-200 rounded-lg flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="font-bold text-blue-950 block text-[11px]">Recommended Playbook Read:</span>
            <span className="text-[11px] font-medium text-blue-800">"The Scarcity Loop: Why Pitching Your Features via Text Destroys B2B Meeting Bookings"</span>
          </div>
          <a 
            href="#blog-scarcity-loop" 
            onClick={(e) => { e.preventDefault(); alert("Educational resource modal under development."); }}
            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 whitespace-nowrap"
          >
            Read Article <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {dbTask.status !== 'completed' && (
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => onCompleteTask(dbTask, { framework_reviewed: true })}
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm"
        >
          I am aligned with this goal
        </Button>
      )}
    </div>
  );
}