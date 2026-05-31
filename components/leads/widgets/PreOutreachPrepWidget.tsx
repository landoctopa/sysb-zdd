'use client';
// components/leads/widgets/PreOutreachPrepWidget.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Save, Loader2 } from 'lucide-react';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Action = Database['public']['Tables']['actions']['Row'];

interface PrepWidgetProps {
  dbTask: Action;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedAction: Action) => void;
}

export default function PreOutreachPrepWidget({ dbTask, isOpen, onClose, onSaveSuccess }: PrepWidgetProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [spinSituation, setSpinSituation] = useState('');
  const [spinProblem, setSpinProblem] = useState('');
  const [spinImplication, setSpinImplication] = useState('');
  const [spinNeedPayoff, setSpinNeedPayoff] = useState('');

  useEffect(() => {
    const currentMeta = (dbTask.metadata as Record<string, any>) || {};
    if (currentMeta.spin_framework) {
      setSpinSituation(currentMeta.spin_framework.situation || '');
      setSpinProblem(currentMeta.spin_framework.problem || '');
      setSpinImplication(currentMeta.spin_framework.implication || '');
      setSpinNeedPayoff(currentMeta.spin_framework.need_payoff || '');
    } else {
      setSpinSituation('');
      setSpinProblem('');
      setSpinImplication('');
      setSpinNeedPayoff('');
    }
  }, [dbTask, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spinSituation.trim() || !spinProblem.trim() || !spinImplication.trim() || !spinNeedPayoff.trim()) {
      toast.error('Please answer all four questions before saving.');
      return;
    }

    const toastId = toast.loading('Saving review notes...');
    const currentMeta = (dbTask.metadata as Record<string, any>) || {};
    setIsSaving(true);

    try {
      const response = await fetch(`/api/actions/${dbTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            spin_framework: {
              situation: spinSituation.trim(),
              problem: spinProblem.trim(),
              implication: spinImplication.trim(),
              need_payoff: spinNeedPayoff.trim()
            }
          }
        })
      });

      if (!response.ok) throw new Error('Database write rejected');
      const updatedAction = await response.json();

      toast.success('Pre-outreach notes saved!', { id: toastId });
      onSaveSuccess(updatedAction);
      onClose();
    } catch (err) {
      toast.error('Could not save notes.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg md:max-w-xl rounded-xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <FileText className="h-4 w-4" /> Pre-Outreach Review Notes
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Take a brief moment to note down what this company does and what challenges they face before you get in touch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-5 text-xs pt-2">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. What do they currently do? (Current setup)</label>
            <textarea 
              placeholder="e.g., They make cold-pressed juices and track inventory manually using spreadsheets." 
              value={spinSituation} 
              onChange={(e) => setSpinSituation(e.target.value)} 
              rows={2} 
              className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" 
              disabled={isSaving} 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. What challenge or problem are they facing right now?</label>
            <textarea 
              placeholder="e.g., Orders get delayed during peak season and spreadsheets columns mismatch silently." 
              value={spinProblem} 
              onChange={(e) => setSpinProblem(e.target.value)} 
              rows={2} 
              className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" 
              disabled={isSaving} 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. What happens if they don't fix this problem? (The true cost)</label>
            <textarea 
              placeholder="e.g., They lose customer trust, receive bad reviews, and waste roughly 10% of their product margin." 
              value={spinImplication} 
              onChange={(e) => setSpinImplication(e.target.value)} 
              rows={2} 
              className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" 
              disabled={isSaving} 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. How can we help them fix it easily?</label>
            <textarea 
              placeholder="e.g., Our dashboard automates tracking lines completely, cutting verification times to 5 minutes." 
              value={spinNeedPayoff} 
              onChange={(e) => setSpinNeedPayoff(e.target.value)} 
              rows={2} 
              className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" 
              disabled={isSaving} 
              required 
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-xs hover:bg-slate-50 text-slate-500 font-bold" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 px-4 shadow-sm rounded-md">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Notes
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}