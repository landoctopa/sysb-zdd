'use client';
// components/leads/widgets/PreOutreachPrepWidget.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, Loader2, CheckSquare, ExternalLink } from 'lucide-react';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Action = Database['public']['Tables']['actions']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

interface PrepWidgetProps {
  lead: Lead;
  dbTask: Action;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedAction: Action) => void;
}

export default function PreOutreachPrepWidget({ lead, dbTask, isOpen, onClose, onSaveSuccess }: PrepWidgetProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [checkSignal, setCheckSignal] = useState(false);
  const [checkWebsite, setCheckWebsite] = useState(false);
  const [checkLinkedin, setCheckLinkedin] = useState(false);
  const [checkSocials, setCheckSocials] = useState(false);
  const [checkProducts, setCheckProducts] = useState(false);
  const [checkReviews, setCheckReviews] = useState(false);
  const [optionalNotes, setOptionalNotes] = useState('');

  useEffect(() => {
    const currentMeta = (dbTask.metadata as Record<string, any>) || {};
    if (currentMeta.spin_framework) {
      setCheckSignal(!!currentMeta.spin_framework.has_reviewed_signal);
      setCheckWebsite(!!currentMeta.spin_framework.has_reviewed_website);
      setCheckLinkedin(!!currentMeta.spin_framework.has_reviewed_linkedin);
      setCheckSocials(!!currentMeta.spin_framework.has_reviewed_socials);
      setCheckProducts(!!currentMeta.spin_framework.has_reviewed_products);
      setCheckReviews(!!currentMeta.spin_framework.has_reviewed_reviews);
      setOptionalNotes(currentMeta.spin_framework.user_preflight_notes || '');
    } else {
      setCheckSignal(false);
      setCheckWebsite(false);
      setCheckLinkedin(false);
      setCheckSocials(false);
      setCheckProducts(false);
      setCheckReviews(false);
      setOptionalNotes('');
    }
  }, [dbTask, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkSignal || !checkWebsite || !checkLinkedin) {
      toast.error('Please check off the first 3 required steps before saving.');
      return;
    }

    const toastId = toast.loading('Saving your checklist...');
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
              has_reviewed_signal: checkSignal,
              has_reviewed_website: checkWebsite,
              has_reviewed_linkedin: checkLinkedin,
              has_reviewed_socials: checkSocials,
              has_reviewed_products: checkProducts,
              has_reviewed_reviews: checkReviews,
              user_preflight_notes: optionalNotes.trim()
            }
          }
        })
      });

      if (!response.ok) throw new Error('Database write rejected');
      const updatedAction = await response.json();

      toast.success('Checklist saved!', { id: toastId });
      onSaveSuccess(updatedAction);
      onClose();
    } catch (err) {
      toast.error('Could not save checklist.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg rounded-xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <CheckSquare className="h-4 w-4" /> Pre-Outreach Checklist
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Make sure you have a basic grasp of who this company is and what they are up to before you reach out.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2 text-xs">
          
          {/* Must-Do Steps Section */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Must-Do Steps</span>
            
            {/* 1. News/Update */}
            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-signal"
                checked={checkSignal} 
                onChange={(e) => setCheckSignal(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <div className="space-y-1">
                <label htmlFor="check-signal" className="font-medium text-slate-700 cursor-pointer select-none">
                  I read the news or market update that triggered this opportunity.
                </label>
                {lead.source_link && (
                  <div className="block">
                    <a 
                      href={lead.source_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 border border-blue-100 px-2 py-0.5 rounded transition-colors"
                    >
                      Read news article <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Corporate Website */}
            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-website"
                checked={checkWebsite} 
                onChange={(e) => setCheckWebsite(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <div className="space-y-1">
                <label htmlFor="check-website" className="font-medium text-slate-700 cursor-pointer select-none">
                  I opened their website to see what they sell or do.
                </label>
                {lead.website && (
                  <div className="block">
                    <a 
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 border border-blue-100 px-2 py-0.5 rounded transition-colors"
                    >
                      Open website <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 3. LinkedIn Profiles */}
            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-linkedin"
                checked={checkLinkedin} 
                onChange={(e) => setCheckLinkedin(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <div className="space-y-1">
                <label htmlFor="check-linkedin" className="font-medium text-slate-700 cursor-pointer select-none">
                  I looked at their company page or key people on LinkedIn.
                </label>
                {lead.linkedin_url && (
                  <div className="block">
                    <a 
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 border border-blue-100 px-2 py-0.5 rounded transition-colors"
                    >
                      Open LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Extra Context Section */}
          <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-lg border border-slate-200 border-dashed">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Extra Context (Recommended)</span>

            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-socials"
                checked={checkSocials} 
                onChange={(e) => setCheckSocials(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <label htmlFor="check-socials" className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer select-none">
                I glanced at their recent social media posts.
              </label>
            </div>

            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-products"
                checked={checkProducts} 
                onChange={(e) => setCheckProducts(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <label htmlFor="check-products" className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer select-none">
                I have a basic idea of their products or latest marketing campaigns.
              </label>
            </div>

            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox" 
                id="check-reviews"
                checked={checkReviews} 
                onChange={(e) => setCheckReviews(e.target.checked)} 
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900 shrink-0 cursor-pointer" 
                disabled={isSaving} 
              />
              <label htmlFor="check-reviews" className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer select-none">
                I looked up reviews or feedback from their actual customers.
              </label>
            </div>
          </div>

          {/* Optional Notes Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Any custom observations or reminders? (Optional)</label>
            <textarea 
              placeholder="e.g., 'Mention their brand new packaging design' or 'They have a mutual connection with me via...'" 
              value={optionalNotes} 
              onChange={(e) => setOptionalNotes(e.target.value)} 
              rows={2} 
              className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" 
              disabled={isSaving} 
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="h-8.5 text-xs hover:bg-slate-50 text-slate-500 font-bold" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving || !checkSignal || !checkWebsite || !checkLinkedin} className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 px-4 shadow-sm rounded-md transition-all">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Checklist
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}