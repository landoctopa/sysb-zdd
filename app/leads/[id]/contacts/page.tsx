import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Import our interactive client panel (we will write this right below in the same file)
import ContactsDirectoryClient from '@/components/leads/ContactsDirectoryClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadContactsPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Fetch the primary company name for context headers
  const { data: lead } = await supabase
    .from('leads')
    .select('id, company_name, status')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  // 2. Pull down all contacts linked to this specific lead
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 text-foreground">
      
      {/* PAGE RUNNING HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <Link 
            href={`/leads/${lead.id}`} 
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 transition-colors group mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transform group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Active Workspace
          </Link>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> People Directory for {lead.company_name}
          </h1>
        </div>
        <Badge variant="outline" className="bg-muted/30 text-muted-foreground font-semibold text-xs py-1 px-2.5 self-start sm:self-auto">
          {contacts?.length || 0} Contacts Saved
        </Badge>
      </div>

      {/* INTERACTIVE COMPONENT DIRECTORY ENGINE */}
      <ContactsDirectoryClient 
        leadId={lead.id} 
        currentStage={lead.status}
        initialContacts={contacts || []} 
      />

    </div>
  );
}