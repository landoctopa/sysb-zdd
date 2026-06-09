'use client';
// components/leads/engaged/Step2CategorizeResponse.tsx

import React from 'react';
import { Database } from '@/database.types';
import { HelpCircle, AlertCircle, Check, ArrowRight } from 'lucide-react';

interface Step2Props {
  dbTask: Database['public']['Tables']['actions']['Row'];
  isSaving: boolean;
  onCompleteTask: (task: any, meta?: Record<string, any>) => void;
}

const CATEGORIES = [
  { id: 'curious_question', title: 'The Curious Question', example: '"Interesting. How does this differ from X?" / "What is pricing?"', desc: 'Answer briefly, then pivot. Do not dump features.' },
  { id: 'timid_yes', title: 'The Timid Yes', example: '"Maybe. Send me a deck." / "Check back in Q3."', desc: 'Raise the stakes. Do not send a heavy deck; ask for 5 minutes instead.' },
  { id: 'direct_yes', title: 'The Direct Yes', example: '"Looks relevant. Let\'s chat Tuesday."', desc: 'Execute rapidly. Confirm logistics immediately.' },
  { id: 'referral', title: 'The Referral', example: '"I\'m not the right person, talk to Jane in Ops."', desc: 'Pivot and leverage. Ask for permission to use their name.' }
];

export default function Step2CategorizeResponse({ dbTask, isSaving, onCompleteTask }: Step2Props) {
  const currentCategory = (dbTask.metadata as any)?.response_category;

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {CATEGORIES.map((cat) => {
          const isSelected = currentCategory === cat.id || dbTask.status === 'completed' && currentCategory === cat.id;
          
          return (
            <button
              type="button"
              key={cat.id}
              disabled={dbTask.status === 'completed' || isSaving}
              onClick={() => onCompleteTask(dbTask, { response_category: cat.id })}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all font-sans ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg ring-4 ring-slate-900/10'
                  : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-black text-xs tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{cat.title}</span>
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
                <p className={`text-[11px] leading-relaxed font-medium italic ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{cat.example}</p>
              </div>
              <div className={`mt-3 pt-2 border-t text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'border-white/10 text-blue-400' : 'border-slate-100 text-slate-400'}`}>
                Strategy: {cat.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}