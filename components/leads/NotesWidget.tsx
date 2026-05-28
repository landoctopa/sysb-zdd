// app/leads/[id]/components/NotesWidget.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface NotesWidgetProps {
  leadId: string;
  currentStage: string;
  onNoteSaved: (newNoteAction: any) => void;
}

export default function NotesWidget({ leadId, currentStage, onNoteSaved }: NotesWidgetProps) {
  const [noteText, setNoteText] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const toastId = toast.loading('Saving your note...');

    startTransition(async () => {
      try {
        // Direct internal API dispatch to insert a row into our unified actions ledger
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            stage: currentStage,      // Captures the exact phase of the project automatically
            type: 'note',             // Identifies this record as a static text note
            channel: 'internal',
            status: 'completed',      // Notes are immediately historical items
            title: `Manual Note taken during ${currentStage}`,
            body: noteText.trim(),
            metadata: { client_timestamp: new Date().toISOString() }
          }),
        });

        if (!response.ok) throw new Error('Could not save record');
        const savedAction = await response.json();

        toast.success('Note saved to your history.', { id: toastId });
        setNoteText('');
        onNoteSaved(savedAction); // Push instantly up to reload client timeline views
      } catch (err) {
        toast.error('Failed to log your note. Try again.', { id: toastId });
      }
    });
  };

  return (
    <form onSubmit={handleSaveNote} className="bg-card rounded-xl border border-border/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <FileText className="h-4 w-4 text-primary" />
        Quick Scratchpad & Meeting Notes
      </div>
      
      <Textarea
        placeholder={`Type out any thoughts or conversation details here. We will save this note directly inside your ${currentStage} project history...`}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        className="text-xs bg-muted/10 border-muted focus:bg-background min-h-[90px] resize-none"
        disabled={isPending}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground font-medium">
          Auto-tagging: <span className="text-foreground font-semibold uppercase">{currentStage}</span>
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={!noteText.trim() || isPending}
          className="h-8 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground gap-1.5 shadow-sm"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Note
        </Button>
      </div>
    </form>
  );
}