'use client';

// components/leads/DraftEmailModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead, $activeContacts, addCommunication } from '@/store/leadsStore';
import { buildGmailUrl } from '@/lib/url-helpers';
import { toast } from 'sonner';

export function DraftEmailModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lead = useStore($activeLead);
  const contacts = useStore($activeContacts);
  const [contactId, setContactId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedContact = contacts.find(c => c.id === contactId);

  const handleOpenGmail = () => {
    const recipient = selectedContact?.email || toEmail;
    if (!recipient) {
      toast.error('Please select a contact or enter an email address');
      return;
    }
    const url = buildGmailUrl(recipient, subject, body);
    window.open(url, '_blank');
    
    // Also save a record
    if (lead) {
      // FIX: Realigned property names to match exact 'communications' schema definitions
      addCommunication(lead.id, {
        channel: 'email', // Changed from 'type'
        direction: 'outbound',
        subject: subject.trim() || null,
        body: body.trim() || null, // Changed from 'content'
        contact_id: contactId || null,
      }).catch(console.error);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Draft Email</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
            <SelectContent>
              {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {(!selectedContact?.email) && (
            <Input placeholder="Or enter email address" value={toEmail} onChange={e => setToEmail(e.target.value)} />
          )}
          <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea placeholder="Body" rows={5} value={body} onChange={e => setBody(e.target.value)} />
          <Button onClick={handleOpenGmail} className="w-full">Open in Gmail</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}