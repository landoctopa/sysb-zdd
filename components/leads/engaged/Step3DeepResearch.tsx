'use client';
// components/leads/engaged/Step3DeepResearch.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Compass, BookmarkCheck } from 'lucide-react';
import { Database } from '@/database.types';
import { toast } from 'sonner';

interface Step3Props {
  lead: Database['public']['Tables']['leads']['Row'];
  dbTask: Database['public']['Tables']['actions']['Row'];
  isSaving: boolean;
  onCompleteTask: (task: any, meta?: Record<string, any>) => void;
}

export default function Step3DeepResearch({ lead, dbTask, isSaving, onCompleteTask }: Step3Props) {
  const [commonGrounds, setCommonGrounds] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    const meta = (dbTask.metadata as Record<string, any>) || {};
    if (meta.researched_hooks) {
      setCommonGrounds(meta.researched_hooks);
    }
  }, [dbTask]);

  const handleSaveResearch = async () => {
    if (!commonGrounds.trim()) {
      toast.error('Please record at least one common ground indicator or shared interest hook.');
      return;
    }

    setIsMutating(true);
    try {
      onCompleteTask(dbTask, {
        research_hooks_saved: true,
        researched_hooks: commonGrounds.trim()
      });
      toast.success('Rapport tokens saved to deal memory logs.');
    } catch (err) {
      toast.error('Failed to log background intelligence tokens.');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full font-sans text-xs">
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm max-w-2xl text-slate-800">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 select-none">
          <Compass className="h-4.5 w-4.5 text-indigo-600" /> Humanizing Your B2B Relationship Track
        </h4>
        <p className="text-slate-600 font-medium leading-relaxed">
          Before you click send, scan their personal profiles or business news. Look for common ground—shared alumni paths, industry associations, physical locations, or specific topics they discuss publicly.
        </p>

        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Rapport Observations & Found Common Grounds
          </label>
          <textarea
            rows={3}
            disabled={dbTask.status === 'completed' || isSaving || isMutating}
            placeholder="e.g., Both went to IIT Delhi, active members in the B2B SaaS Network group, or both based locally near the financial hub for quick drop-ins..."
            value={commonGrounds}
            onChange={(e) => setCommonGrounds(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed placeholder:text-slate-400"
          />
        </div>
      </div>

      {dbTask.status !== 'completed' && (
        <Button
          type="button"
          disabled={isSaving || isMutating || !commonGrounds.trim()}
          onClick={handleSaveResearch}
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1.5 flex items-center"
        >
          {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lock In Common Grounds
        </Button>
      )}

      {dbTask.status === 'completed' && (
        <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 h-8.5 w-fit flex items-center gap-1 rounded-md shadow-sm select-none">
          <BookmarkCheck className="h-3.5 w-3.5" /> Intelligence Hooks Locked Into Copy Editor
        </div>
      )}
    </div>
  );
}