'use client';

// app/leads/[id]/LeadWorkbenchClient.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Briefcase,
  Search,
  Radio,
  History,
  Users,
  CheckSquare,
  Bell,
  ArrowRight,
  Globe,
  Tag,
  Users2,
  MapPin,
  Target,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Database } from '@/database.types';

import PipelineHeader from '@/components/leads/PipelineHeader';
import DiscoveryStageWorkspace from '@/components/leads/DiscoveryStageWorkspace';
import NotesWidget from '@/components/leads/NotesWidget';

// Import your custom LinkedIn component handled in your first design choice
import { LinkedInIcon } from '@/components/icons/LinkedIn';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface WorkbenchProps {
  initialLead: Lead;
  initialActions: Action[];
  initialContacts: Contact[];
}

export default function LeadWorkbenchClient({ initialLead, initialActions, initialContacts }: WorkbenchProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [activeTab, setActiveTab] = useState('workspace');

  const handleActionUpdated = (updatedAction: Action) => {
    setActions((prev) => prev.map((act) => act.id === updatedAction.id ? updatedAction : act));
  };

  const handleActionCreated = (newAction: Action) => {
    setActions((prev) => [newAction, ...prev]);
  };

  // Safely parse your background storage details vault
  const details = (lead.company_details as Record<string, any>) || {};

  const pendingTasks = actions.filter(a => a.type === 'task' && a.status === 'pending');
  const recentNotifications = actions.filter(a => a.type === 'notification').slice(0, 3);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 text-foreground">
      <PipelineHeader
        lead={lead}
        actions={actions}
        contacts={contacts}
        setLead={setLead}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-8 space-y-4">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border/60 pb-2">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="workspace" className="gap-1.5 text-xs">
                  <Briefcase className="h-3.5 w-3.5" /> Your Active Step
                </TabsTrigger>
                <TabsTrigger value="research" className="gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" /> The Research Desk
                </TabsTrigger>
                <TabsTrigger value="listening" className="gap-1.5 text-xs">
                  <Radio className="h-3.5 w-3.5" /> Company Info & Radar
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="workspace" className="space-y-4 mt-4 animate-fadeIn">
              {/* Discovery Stage Workspace */}
              {lead.status === 'discovery' && (
                <DiscoveryStageWorkspace
                  lead={lead}
                  actions={actions}
                  contacts={contacts}
                  onActionUpdated={handleActionUpdated}
                  onActionCreated={handleActionCreated}
                  onLeadUpdated={setLead}
                  onContactCreated={(newContact) => setContacts((prev) => [...prev, newContact])}
                  onContactUpdated={(updatedContact) => setContacts((prev) => prev.map(c => c.id === updatedContact.id ? updatedContact : c))}
                  onContactDeleted={(id) => setContacts((prev) => prev.filter(c => c.id !== id))}
                />
              )}

              {/* Placeholder blocks for downstream milestones to keep layout compilation safe */}
              {lead.status === 'engaged' && (
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center font-medium text-slate-500">
                  Engaged Stage Workspace active. Ready to coordinate stakeholder mapping.
                </div>
              )}

              {lead.status === 'solution_fit' && (
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center font-medium text-slate-500">
                  Solution Fit Workspace active. Technical requirements tracking engine ready.
                </div>
              )}

              {lead.status === 'proposal' && (
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center font-medium text-slate-500">
                  Proposal Phase Workspace active. Commercial quote tracking enabled.
                </div>
              )}

              {lead.status === 'negotiation' && (
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center font-medium text-slate-500">
                  Negotiation Phase Workspace active. Contract redline monitoring active.
                </div>
              )}

              {lead.status === 'close' && (
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center font-medium text-slate-500">
                  Closing Phase Workspace active. Contract execution and binary outcome logs ready.
                </div>
              )}

              {/* Terminal States Guardrail View */}
              {(lead.status === 'won' || lead.status === 'lost') && (
                <div className={`p-6 border rounded-xl shadow-sm text-center font-bold uppercase tracking-wider text-xs ${lead.status === 'won'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                  This opportunity has been closed and archived as a Deal {lead.status === 'won' ? 'Win' : 'Loss'}.
                </div>
              )}

              <NotesWidget
                leadId={lead.id}
                currentStage={lead.status}
                onNoteSaved={handleActionCreated}
              />
            </TabsContent>

            <TabsContent value="research" className="bg-card rounded-xl border border-border/60 p-5 mt-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Background Intelligence Dossier
              </h3>
              <div className="bg-muted/10 border border-border/40 rounded-lg p-4 space-y-3 text-xs leading-relaxed">
                <p><strong>Initial Market Trigger Analysis:</strong> {lead.strategic_analysis || 'No initial analysis logged.'}</p>
                <p><strong>Trigger Fit Rationale:</strong> {lead.trigger_alignment || 'No trigger alignment data found.'}</p>
              </div>
            </TabsContent>

            {/* UPGRADED TAB CONTENT 3: CONSUMES BOTH FIXED FIELD COLUMNS AND THE DETAILS VAULT */}
            <TabsContent value="listening" className="space-y-4 mt-4 animate-fadeIn">

              {/* PRIMARY DETAILS DIRECT GRID VIEW */}
              <div className="bg-card rounded-xl border border-border/60 p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" /> Company Profile Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                  {/* Flat Column 1: Website Link */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Web Domain</span>
                      {lead.website ? (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                          {lead.website} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : <span className="text-muted-foreground">Unlisted</span>}
                    </div>
                  </div>

                  {/* Flat Column 2: Industry Tag */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Industry Sector</span>
                      <span className="font-semibold text-foreground">{lead.industry || 'Not Selected'}</span>
                    </div>
                  </div>

                  {/* Flat Column 3: Brand LinkedIn with Custom Corporate Icon */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <div className="text-muted-foreground shrink-0"><LinkedInIcon size={16} /></div>
                    <div className="truncate">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">LinkedIn Company Page</span>
                      {lead.linkedin_url ? (
                        <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                          View Profile <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : <span className="text-muted-foreground">Not Connected</span>}
                    </div>
                  </div>

                  {/* Vault Extraction 1: Headcount */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <Users2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Approximate Headcount</span>
                      <span className="font-semibold text-foreground">{details.employee_count ? `${details.employee_count} employees` : 'Unknown Size'}</span>
                    </div>
                  </div>

                  {/* Vault Extraction 2: HQ Location */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Corporate Headquarters</span>
                      <span className="font-semibold text-foreground">{details.address || 'Not Added'}</span>
                    </div>
                  </div>

                  {/* Vault Extraction 3: Target Market */}
                  <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 border border-border/40 rounded-lg">
                    <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Primary Target Market</span>
                      <span className="font-semibold text-foreground">{details.target_market || 'Not Specified'}</span>
                    </div>
                  </div>

                </div>

                {/* Optional Stock Ticker Banner Row */}
                {details.stock_ticker && (
                  <div className="p-2.5 bg-secondary/10 border border-secondary/20 rounded-lg text-xs flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-secondary" />
                    <span>Public Equity Market Trading Symbol: <span className="font-mono font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">{details.stock_ticker}</span></span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-card border border-dashed border-border/60 rounded-xl text-center text-xs text-muted-foreground">
                Continuous web tracking is active. Incoming updates regarding executive shifts or announcements will update here automatically.
              </div>

            </TabsContent>
          </Tabs>

        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm space-y-4 text-xs">

            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Mapped People ({contacts.length})
              </span>
              <Link href={`/leads/${lead.id}/contacts`} className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 transition-colors">
                Full Directory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" /> Total Logs ({actions.length})
              </span>
              <Link href={`/leads/${lead.id}/activity`} className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 transition-colors">
                Search Activity <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2 pt-1">
              <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-primary" /> Upcoming Checklist Steps
              </span>
              {pendingTasks.length === 0 ? (
                <span className="text-muted-foreground block py-1">No active steps pending.</span>
              ) : (
                <div className="space-y-1.5">
                  {pendingTasks.slice(0, 2).map(t => (
                    <div key={t.id} className="p-2 bg-muted/30 border border-border/40 rounded-lg font-medium text-foreground truncate">
                      • {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-primary" /> System Notifications
              </span>
              {recentNotifications.length === 0 ? (
                <span className="text-muted-foreground block py-1">No recent alerts.</span>
              ) : (
                <div className="space-y-1.5">
                  {recentNotifications.map(n => (
                    <div key={n.id} className="p-2 bg-primary/5 border border-primary/10 rounded-lg text-foreground leading-relaxed">
                      {n.body}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}