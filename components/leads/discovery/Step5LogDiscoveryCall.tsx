'use client';
// components/leads/discovery/Step5LogDiscoveryCall.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from '@/database.types';

type Action = Database['public']['Tables']['actions']['Row'];

interface Step5Props {
  dbTask: Action;
  isSaving: boolean;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step5LogDiscoveryCall({ dbTask, isSaving, onCompleteTask }: Step5Props) {
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [financialImpact, setFinancialImpact] = useState('');

  return (
    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800 text-xs">
      <div className="space-y-1.5">
        <span className="font-bold text-slate-900 block">1. Deal Alignment Fit Check</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
            <button key={val} type="button" onClick={() => setFitScore(val)} className={`h-8 w-8 font-black text-xs rounded-lg border transition-all ${fitScore === val ? 'bg-slate-900 border-slate-900 text-white scale-105 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{val}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="font-bold text-slate-900 block">2. Financial Impact Description</span>
        <input type="text" placeholder="What is this problem costing them in revenue or time? Note it down here..." value={financialImpact} onChange={(e) => setFinancialImpact(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-400 text-slate-900 font-medium transition-colors" />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button type="button" size="sm" disabled={fitScore === null || !financialImpact.trim() || isSaving} onClick={() => onCompleteTask(dbTask, { score: fitScore, financial_impact: financialImpact.trim() })} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm">Save Details & Close Milestone</Button>
      </div>
    </div>
  );
}