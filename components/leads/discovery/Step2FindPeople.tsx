'use client';
// components/leads/discovery/Step2FindPeople.tsx

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/database.types';
import { toast } from 'sonner';

// Import our new selective picker overlay widget
import EmployeeSelectorWidget from '../widgets/EmployeeSelectorWidget';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Step2Props {
  lead: Lead; // Passed parent row context down
  dbTask: Action;
  contacts: Contact[];
  isSaving: boolean;
  onAddPerson: () => void;
  onEditPerson: (contact: Contact) => void;
  onDeletePerson: (id: string) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
  onContactCreated: (contact: Contact) => void; // Sync state up smoothly
}

export default function Step2FindPeople({
  lead,
  dbTask,
  contacts,
  isSaving,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onCompleteTask,
  onContactCreated
}: Step2Props) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [isPremium, setIsPremium] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [scrapedEmployees, setScrapedEmployees] = useState<any[]>([]);

  // Check user membership level on mount
  useEffect(() => {
    async function evaluateTier() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
        if (data?.is_premium) setIsPremium(true);
      }
    }
    evaluateTier();
  }, []);

  const handleFetchKeyPeople = async () => {
    if (!lead.linkedin_url) {
      toast.error('Please add and save a company LinkedIn profile URL in Step 1 first.');
      return;
    }

    const toastId = toast.loading('Iris is pulling employee directory lists via Apify...');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}/enrich/people`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyLinkedinUrl: lead.linkedin_url })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to parse data payload');

        if (!data.employees || data.employees.length === 0) {
          toast.info('No key management profiles found matching our target leadership criteria handles.', { id: toastId });
          return;
        }

        setScrapedEmployees(data.employees);
        setIsSelectorOpen(true);
        toast.success(`Found ${data.employees.length} potential key decision-makers!`, { id: toastId });
      } catch (err: any) {
        toast.error(err.message || 'Could not query employee endpoints.', { id: toastId });
      }
    });
  };

  return (
    <div className="pt-1 px-1 space-y-4 w-full text-xs font-semibold text-slate-700">
      {contacts.length > 0 && (
        <div className="space-y-2 w-full animate-fadeIn">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 mb-1 select-none">
            Added people ({contacts.length})
          </div>

          {contacts.map((person) => (
            <div key={person.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 shadow-sm w-full text-slate-900">
              <div className="space-y-0.5 min-w-0">
                <span className="font-bold text-slate-900 truncate text-[12px] block">{person.name}</span>
                <span className="text-slate-500 text-[11px] font-medium block truncate">{person.role || 'No position recorded'}</span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => onEditPerson(person)}
                  className="h-7.5 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 px-3 rounded-md shadow-sm"
                >
                  Edit
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeletePerson(person.id)}
                  className="h-7.5 w-7.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer Button Renders */}
      <div className="flex flex-wrap gap-2.5 pt-1 items-center">
        <Button 
          type="button" 
          onClick={onAddPerson}
          disabled={isPending}
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1 flex items-center"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add Manual Contact
        </Button>

        {/* 💎 PRO TIERS DYNAMIC BACKGROUND LOOKUP INJECTION */}
        {isPremium && (
          <Button
            type="button"
            disabled={isPending}
            onClick={handleFetchKeyPeople}
            className="h-8.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 rounded-md shadow-sm gap-1.5 flex items-center border-none"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Scan Key People via Iris Pro
          </Button>
        )}

        {dbTask.status !== 'completed' && (
          contacts.length >= 2 ? (
            <Button
              type="button"
              disabled={isSaving || isPending}
              onClick={() => onCompleteTask(dbTask, { total_mapped: contacts.length })}
              className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-md shadow-sm border border-emerald-700"
            >
              I have completed this task
            </Button>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md px-3 h-8.5 flex items-center gap-1.5 shadow-sm select-none">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> 
              Add {2 - contacts.length} more person to complete this task.
            </div>
          )
        )}
      </div>

      {/* Selective Data Ingestion Modal Overlays */}
      <EmployeeSelectorWidget
        lead={lead}
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        employees={scrapedEmployees}
        existingContacts={contacts}
        onContactAdded={onContactCreated}
      />
    </div>
  );
}