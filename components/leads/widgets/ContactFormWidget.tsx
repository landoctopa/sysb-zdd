'use client';
// components/leads/widgets/ContactFormWidget.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Save, Loader2, Phone, FileText } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface ContactWidgetProps {
  lead: Lead;
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (contact: Contact, isEdit: boolean) => void;
}

export default function ContactFormWidget({ lead, contact, isOpen, onClose, onSaveSuccess }: ContactWidgetProps) {
  // 🛠️ FIX: Using explicit useState for loading instead of useTransition to prevent async locking bugs
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      setRole(contact.role || '');
      setEmail(contact.email || '');
      setLinkedin(contact.linkedin_url || '');
      setPhone(contact.phone || '');
      setNotes(contact.notes || '');
    } else {
      setName('');
      setRole('');
      setEmail('');
      setLinkedin('');
      setPhone('');
      setNotes('');
    }
  }, [contact, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    const isEdit = !!contact;
    const toastId = toast.loading(isEdit ? 'Saving contact updates...' : 'Adding new contact...');
    
    const endpoint = isEdit ? `/api/contacts/${contact.id}` : `/api/contacts`;
    const method = isEdit ? 'PATCH' : 'POST';

    setIsSaving(true); // Engages standard component thread safety lock

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          name: name.trim(),
          role: role.trim() || null,
          email: email.trim() || null,
          linkedin_url: linkedin.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          is_decision_maker: contact?.is_decision_maker ?? null,
          status: contact?.status || 'identified'
        })
      });

      if (!response.ok) throw new Error('Database write rejected');
      const savedContact = await response.json();

      toast.success(isEdit ? 'Contact updated!' : 'Contact saved to roster!', { id: toastId });
      
      // 🛠️ Execute callback to update array state before executing close mechanisms
      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess(savedContact, isEdit);
      }
      
      onClose(); // Cleanly unmounts modal view matrix
    } catch (err) {
      toast.error('Could not save contact information.', { id: toastId });
    } finally {
      setIsSaving(false); // Releases thread thread lock cleanly
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg md:max-w-xl rounded-xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <User className="h-4 w-4" /> {contact ? 'Edit Contact Details' : 'Add New Contact'}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Record stakeholder details and connection routes directly to your target deal roster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6 text-xs pt-2">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name *</label>
              <input type="text" placeholder="e.g. John Doe" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Briefcase className="h-3 w-3" /> Corporate Role</label>
              <input type="text" placeholder="e.g. Head of Operations" value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</label>
              <input type="text" placeholder="e.g. +1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><LinkedInIcon size={12} /> LinkedIn URL</label>
            <input type="text" placeholder="linkedin.com/in/username" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText className="h-3 w-3" /> Notes</label>
            <textarea placeholder="Record personal pain points or background logs here..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" disabled={isSaving} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-xs hover:bg-slate-50 text-slate-500 font-bold" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 px-4 shadow-sm rounded-md">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {contact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}