'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Heart, 
  Smile, 
  XCircle, 
  Check, 
  Loader2, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/database.types';
import { LinkedInIcon } from '@/components/icons/LinkedIn';

type Contact = Database['public']['Tables']['contacts']['Row'];

interface ClientProps {
  leadId: string;
  currentStage: string;
  initialContacts: Contact[];
}

export default function ContactsDirectoryClient({ leadId, currentStage, initialContacts }: ClientProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New Contact local form state definitions
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLinkedin, setNewLinkedin] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');

  // 1. Core State Mutation: Updates a contact row's status or details metadata
  const handleUpdateContact = (contactId: string, updatedFields: Partial<Contact>) => {
    const toastId = toast.loading('Saving relationship notes...');

    startTransition(async () => {
      try {
        const response = await fetch(`/api/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields),
        });

        if (!response.ok) throw new Error('Update rejected');
        const updatedContact = await response.json();

        setContacts(prev => prev.map(c => c.id === contactId ? updatedContact : c));
        toast.success('Contact profile updated successfully!', { id: toastId });
        
        // Tells the background router to refresh server layout files so exit gates stay in sync
        router.refresh();
      } catch (err) {
        toast.error('Could not save your adjustments. Try again.', { id: toastId });
      }
    });
  };

  // 2. Core State Mutation: Inserts a brand new contact row entry
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) {
      toast.error('Please include at least a name and job title.');
      return;
    }

    const toastId = toast.loading('Adding person to company roster...');

    startTransition(async () => {
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            name: newName.trim(),
            role: newRole.trim(),
            email: newEmail.trim() || null,
            phone: newPhone.trim() || null,
            linkedin_url: newLinkedin.trim() || null,
            status: 'discovered', // Default state
            metadata: {
              likes: likes.trim() ? likes.split(',').map(l => l.trim()) : [],
              dislikes: dislikes.trim() ? dislikes.split(',').map(d => d.trim()) : []
            }
          }),
        });

        if (!response.ok) throw new Error('Creation failed');
        const newlyCreated = await response.json();

        // Log a historical event notification action behind the scenes
        await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            stage: currentStage,
            type: 'notification',
            channel: 'internal',
            status: 'completed',
            title: 'New Roster Member Added',
            body: `${newlyCreated.name} was added to the directory as ${newlyCreated.role}.`
          })
        });

        setContacts(prev => [...prev, newlyCreated]);
        toast.success(`${newlyCreated.name} is now saved!`, { id: toastId });
        
        // Reset inputs and close tray
        setNewName(''); setNewRole(''); setNewEmail(''); setNewPhone(''); setNewLinkedin(''); setLikes(''); setDislikes('');
        setShowAddForm(false);
        router.refresh();
      } catch (err) {
        toast.error('Failed to create contact track.', { id: toastId });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT AREA: CURRENT DIRECTORY LIST OF CARDS */}
      <div className="lg:col-span-8 space-y-4">
        {contacts.length === 0 ? (
          <Card className="p-12 text-center text-xs text-muted-foreground border-dashed bg-card">
            No contacts are linked to this record yet. Use the tool form on the right to start mapping your network.
          </Card>
        ) : (
          contacts.map((person) => {
            const meta = (person.metadata as Record<string, any>) || {};
            const personLikes = Array.isArray(meta.likes) ? meta.likes : [];
            const personDislikes = Array.isArray(meta.dislikes) ? meta.dislikes : [];

            return (
              <Card key={person.id} className="border border-border/60 p-4 shadow-sm relative bg-card animate-fadeIn text-xs">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  
                  {/* DETAIL WRAPPER */}
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground tracking-tight">{person.name}</span>
                        
                        {/* Dynamic Relationship Status Toggles */}
                        <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/40 ml-1">
                          {(['discovered', 'reached_out', 'engaged'] as const).map((st) => {
                            const isCurrent = person.status === st;
                            const labelMap = { discovered: 'Found', reached_out: 'Contacted', engaged: 'Engaged' };
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateContact(person.id, { status: st })}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight transition-all ${
                                  isCurrent 
                                    ? 'bg-background text-foreground shadow-sm font-extrabold border border-border/20' 
                                    : 'text-muted-foreground/60 hover:text-foreground'
                                }`}
                              >
                                {labelMap[st]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-muted-foreground font-medium block">{person.role || 'Unassigned Title'}</span>
                    </div>

                    {/* CONTACT HIGHWAYS */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-[11px] font-medium pt-0.5">
                      {person.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground/70" /> {person.email}</span>}
                      {person.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground/70" /> {person.phone}</span>}
                      {person.linkedin_url && (
                        <a href={person.linkedin_url.startsWith('http') ? person.linkedin_url : `https://${person.linkedin_url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                          <LinkedInIcon size={12} /> Profile Link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    {/* PERSONAL RELATIONSHIP TAG CLOUDS EXTRACTIONS */}
                    {(personLikes.length > 0 || personDislikes.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 mt-1">
                        {personLikes.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Smile className="h-3 w-3" /> Communication Style / Likes</span>
                            <div className="flex flex-wrap gap-1">
                              {personLikes.map((l: string, idx: number) => <span key={idx} className="bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border border-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">{l}</span>)}
                            </div>
                          </div>
                        )}
                        {personDislikes.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1"><XCircle className="h-3 w-3" /> Turn-Offs / Dislikes</span>
                            <div className="flex flex-wrap gap-1">
                              {personDislikes.map((d: string, idx: number) => <span key={idx} className="bg-amber-500/5 text-amber-700 dark:text-amber-300 border border-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">{d}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* RIGHT AREA: CLEAN INLINE ADD FORM CARD PANEL */}
      <div className="lg:col-span-4">
        <Card className="border border-border/60 p-4 shadow-sm bg-card space-y-4">
          <div className="border-b border-border/40 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-primary" /> Record a New Contact
            </h3>
          </div>

          <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-[11px]">Full Name *</label>
              <Input placeholder="e.g., Sarah Jenkins" value={newName} onChange={e => setNewName(e.target.value)} className="h-8.5 bg-muted/10 text-xs focus:bg-background" disabled={isPending} required />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-[11px]">Job Title / Department *</label>
              <Input placeholder="e.g., Operations Lead" value={newRole} onChange={e => setNewRole(e.target.value)} className="h-8.5 bg-muted/10 text-xs focus:bg-background" disabled={isPending} required />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-[11px]">Email Box</label>
              <Input type="email" placeholder="name@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8.5 bg-muted/10 text-xs focus:bg-background" disabled={isPending} />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-[11px]">Phone Line</label>
              <Input placeholder="+1 (555) 000-0000" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="h-8.5 bg-muted/10 text-xs focus:bg-background" disabled={isPending} />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-[11px]">LinkedIn URL Link</label>
              <Input placeholder="linkedin.com/in/username" value={newLinkedin} onChange={e => setNewLinkedin(e.target.value)} className="h-8.5 bg-muted/10 text-xs focus:bg-background" disabled={isPending} />
            </div>

            <div className="space-y-1 pt-1 border-t border-border/40">
              <label className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block mb-0.5">Relationship Builders (Optional)</label>
              <span className="text-[10px] text-muted-foreground block mb-1.5 leading-tight">Separate entries with standard commas.</span>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Likes / Communication Preferences</label>
                  <Input placeholder="e.g., Direct summaries, Coffee enthusiast" value={likes} onChange={e => setLikes(e.target.value)} className="h-8 bg-muted/10 text-xs" disabled={isPending} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Dislikes / Communication Triggers</label>
                  <Input placeholder="e.g., Unexpected cold phone calls, Long emails" value={dislikes} onChange={e => setDislikes(e.target.value)} className="h-8 bg-muted/10 text-xs" disabled={isPending} />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2 gap-1"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Save Contact to Roster
            </Button>
          </form>
        </Card>
      </div>

    </div>
  );
}