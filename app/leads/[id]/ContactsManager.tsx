'use client';

// app/leads/[id]/ContactsManager.tsx

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeContacts } from '@/store/leadsStore';
import { Users, Plus, UserPlus, Mail, Phone, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { AddContactModal } from './AddContactModal';
import { buildGmailUrl } from '@/lib/url-helpers';
import { toast } from 'sonner';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export default function ContactsManager() {
  const contacts = useStore($activeContacts);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMail = (email: string | null | undefined) => {
    if (email) {
      const url = buildGmailUrl(email, '', '');
      window.open(url, '_blank');
    } else {
      toast.info('No email address. Edit contact to add one.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Stakeholders
          {contacts.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {contacts.length}
            </Badge>
          )}
        </h3>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-3 w-3" />
          Add Person
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center bg-muted/5">
          <UserPlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-medium text-muted-foreground">No stakeholders added</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Add decision makers and influencers
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="border-border/60 hover:border-primary/30 transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {getInitials(contact.name || '?')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate text-foreground">
                      {contact.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {contact.title || 'Stakeholder'}
                    </p>
                    {contact.label && (
                      <Badge variant="outline" className="text-[9px] mt-1 px-1.5">
                        {contact.label}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {contact.linkedin_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={contact.linkedin_url} target="_blank" rel="noreferrer">
                          <LinkedInIcon size={14} />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMail(contact.email)}>
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                    {/* Phone button - you can similarly implement a call link or prompt */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => contact.phone && window.open(`tel:${contact.phone}`)}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <AddContactModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </section>
  );
}