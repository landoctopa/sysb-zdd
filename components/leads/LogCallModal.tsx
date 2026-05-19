'use client';

// components/leads/LogCallModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead, $activeContacts, addCommunication } from '@/store/leadsStore';
import { toast } from 'sonner';

export function LogCallModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lead = useStore($activeLead);
  const contacts = useStore($activeContacts);
  const [contactId, setContactId] = useState('');
  
  // FIX 1: Explicitly lock the useState type parameter down to the strict literal union schema rules
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lead) return;
    setIsLoading(true);
    try {
      // FIX 2: Realigned property mappings to conform with the communications data table layouts
      await addCommunication(lead.id, {
        channel: 'call', // Changed from 'type'
        direction,
        body: notes.trim() || null, // Changed from 'content'
        contact_id: contactId || null,
      });
      toast.success('Call logged');
      onOpenChange(false);
      setContactId('');
      setDirection('outbound');
      setNotes('');
    } catch (err) {
      toast.error('Failed to log call');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger><SelectValue placeholder="Select contact (optional)" /></SelectTrigger>
            <SelectContent>
              {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          {/* Force type cast to protect setter changes from string widener exceptions */}
          <Select value={direction} onValueChange={(v: 'outbound' | 'inbound') => setDirection(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Call notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">{isLoading ? 'Saving...' : 'Save Call'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}