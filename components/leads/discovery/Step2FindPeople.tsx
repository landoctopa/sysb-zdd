'use client';
// components/leads/discovery/Step2FindPeople.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { Database } from '@/database.types';

type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Step2Props {
  dbTask: Action;
  contacts: Contact[];
  isSaving: boolean;
  onAddPerson: () => void;
  onEditPerson: (contact: Contact) => void;
  onDeletePerson: (id: string) => void;
  onCompleteTask: (task: Action, meta?: Record<string, any>) => void;
}

export default function Step2FindPeople({
  dbTask,
  contacts,
  isSaving,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onCompleteTask
}: Step2Props) {
  return (
    <div className="pt-1 px-1 space-y-4 w-full">
      {contacts.length > 0 && (
        <div className="space-y-2 w-full animate-fadeIn">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 mb-1 select-none">
            Added people
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

      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button 
          type="button" 
          onClick={onAddPerson}
          className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 rounded-md shadow-sm gap-1 flex items-center"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add person
        </Button>

        {/* 🛠专 FIX: Only show completion status UI elements if the task is currently active/pending */}
        {dbTask.status !== 'completed' && (
          contacts.length >= 2 ? (
            <Button
              type="button"
              disabled={isSaving}
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
    </div>
  );
}