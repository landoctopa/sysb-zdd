'use client';
// components/leads/widgets/EmployeeSelectorWidget.tsx

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Check, Plus, Loader2 } from 'lucide-react';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface ScrapedEmployee {
  id: string;
  name: string;
  role: string;
  linkedin_url: string | null;
  photo_url: string | null;
}

interface SelectorProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  employees: ScrapedEmployee[];
  existingContacts: Contact[];
  onContactAdded: (contact: Contact) => void;
}

export default function EmployeeSelectorWidget({
  lead,
  isOpen,
  onClose,
  employees,
  existingContacts,
  onContactAdded
}: SelectorProps) {
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  const handleSelectAndAdd = async (person: ScrapedEmployee) => {
    // Prevent adding duplicates
    const isAlreadyAdded = existingContacts.some(
      c => c.linkedin_url === person.linkedin_url || c.name.toLowerCase() === person.name.toLowerCase()
    );
    if (isAlreadyAdded) {
      toast.info(`${person.name} is already added to your deal contacts list.`);
      return;
    }

    setProcessingIds(prev => [...prev, person.id]);
    
    try {
      // Hit your existing POST /api/contacts route handler
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          name: person.name,
          role: person.role,
          linkedin_url: person.linkedin_url,
          status: 'identified',
          is_decision_maker: true,
          metadata: { avatar_cached_url: person.photo_url, source: 'apify_enrichment_radar' }
        })
      });

      if (!response.ok) throw new Error('Failed to save record.');
      const savedContact = await response.json();

      onContactAdded(savedContact);
      toast.success(`Added ${person.name} to roster!`);
    } catch (err) {
      toast.error(`Could not add ${person.name} right now.`);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== person.id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg md:max-w-xl rounded-xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <Users className="h-4 w-4 text-blue-600" /> Target Stakeholder Selection
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Iris has filtered the company directory for management keywords. Choose which contacts you want to add to your workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable List Body Grid */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 font-sans text-xs">
          {employees.map((person) => {
            const isAdded = existingContacts.some(
              c => c.linkedin_url === person.linkedin_url || c.name.toLowerCase() === person.name.toLowerCase()
            );
            const isWorking = processingIds.includes(person.id);

            return (
              <div 
                key={person.id} 
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4 hover:border-slate-300 transition-all text-slate-900 font-medium"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {person.photo_url ? (
                    <img 
                      src={person.photo_url} 
                      alt={person.name} 
                      className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200 bg-slate-100"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-500 font-bold flex items-center justify-center shrink-0 uppercase">
                      {person.name[0]}
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-slate-900 text-[12px] block truncate">{person.name}</span>
                    <span className="text-slate-500 text-[11px] block leading-tight line-clamp-2">{person.role}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={isAdded || isWorking}
                  onClick={() => handleSelectAndAdd(person)}
                  className={`h-7.5 px-3 rounded-md text-[11px] font-bold gap-1 transition-all shrink-0 ${
                    isAdded 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-none hover:bg-emerald-50' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                  }`}
                >
                  {isWorking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isAdded ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {isAdded ? 'Added' : 'Select'}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
          <Button 
            type="button" 
            onClick={onClose} 
            className="h-8.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold px-4"
          >
            Close Directory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}