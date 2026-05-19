'use client';
// app/leads/[id]/AddContactModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead, $activeContacts } from '@/store/leadsStore';
import { toast } from 'sonner';

export function AddContactModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lead = useStore($activeLead);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lead) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          name: name.trim(),
          title: title.trim() || null,
          email: email.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          label: label.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const newContact = await res.json();
      // Update store optimistically
      $activeContacts.set([newContact, ...$activeContacts.get()]);
      toast.success('Contact added');
      onOpenChange(false);
      // reset form
      setName('');
      setTitle('');
      setEmail('');
      setLinkedinUrl('');
      setLabel('');
    } catch (err) {
      toast.error('Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Stakeholder</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., CTO" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <Label>Label (optional)</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Decision maker" />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? 'Adding...' : 'Add Person'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}