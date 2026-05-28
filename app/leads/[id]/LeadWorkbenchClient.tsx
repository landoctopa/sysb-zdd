'use client';

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
  FileText
} from 'lucide-react';
import { Database } from '@/database.types';

// Import our decoupled sub-components (we will build these next)
import PipelineHeader from './components/PipelineHeader';
import DiscoveryStageWorkspace from './components/stages/DiscoveryStageWorkspace';
import NotesWidget from '@/components/leads/NotesWidget';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface WorkbenchProps {
  initialLead: Lead;
  initialActions: Action[];
  initialContacts: Contact[];
}

export default function LeadWorkbenchClient({ initialLead, initialActions, initialContacts }: WorkbenchProps) {
  // 1. Central State Trackers
  const [lead, setLead] = useState<Lead>(initialLead);
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  
  // UI Control states
  const [activeTab, setActiveTab] = useState('workspace');

  // 2. Safe State Handlers passed down to child elements
  const handleActionUpdated = (updatedAction: Action) => {
    setActions((prev) => prev.map((act) => act.id === updatedAction.id ? updatedAction : act));
  };

  const handleActionCreated = (newAction: Action) => {
    setActions((prev) => [newAction, ...prev]);
  };

  // Get quick counts for your sidebar indicators
  const pendingTasks = actions.filter(a => a.type === 'task' && a.status === 'pending');
  const recentNotifications = actions.filter(a => a.type === 'notification').slice(0, 3);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 text-foreground">
      
      {/* 🟢 TOP AREA: THE STEADY LIFECYCLE PROGRESS BAR Map */}
      <PipelineHeader 
        lead={lead} 
        actions={actions} 
        contacts={contacts} 
        setLead={setLead} 
      />

      {/* MAIN TWO-COLUMN DISPLAY WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 🏢 LEFT/CENTER SIDE: YOUR THREE CORE DATA DESKS */}
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

            {/* TAB CONTENT 1: ACTIVE CONVERSATION CHECKLIST & SCRATCHPAD */}
            <TabsContent value="workspace" className="space-y-4 mt-4 animate-fadeIn">
              {lead.status === 'discovery' && (
                <DiscoveryStageWorkspace 
                  lead={lead}
                  actions={actions}
                  contacts={contacts}
                  onActionUpdated={handleActionUpdated}
                  onActionCreated={handleActionCreated}
                />
              )}

              {/* Secure scratchpad for fast thoughts during calls/research */}
              <NotesWidget 
                leadId={lead.id} 
                currentStage={lead.status} 
                onNoteSaved={handleActionCreated} 
              />
            </TabsContent>

            {/* TAB CONTENT 2: IMMUTABLE SOURCING FILES AND DOSSIERS */}
            <TabsContent value="research" className="bg-card rounded-xl border border-border/60 p-5 mt-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Background Intelligence Dossier
              </h3>
              <div className="bg-muted/10 border border-border/40 rounded-lg p-4 space-y-3 text-xs leading-relaxed">
                <p><strong>Initial Market Trigger Analysis:</strong> {lead.strategic_analysis || 'No initial analysis logged.'}</p>
                <p><strong>Trigger Fit Rationale:</strong> {lead.trigger_alignment || 'No trigger alignment data found.'}</p>
              </div>
            </TabsContent>

            {/* TAB CONTENT 3: FIRMOGRAPHICS AND THE LIVE NEWS STREAM */}
            <TabsContent value="listening" className="bg-card rounded-xl border border-border/60 p-5 mt-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Live Company Tracking & Radar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-border/40 rounded-lg p-4 bg-background">
                <div><span className="text-muted-foreground font-medium">Web Domain:</span> <span className="font-semibold text-foreground ml-1">{lead.website || 'Not listed'}</span></div>
                <div><span className="text-muted-foreground font-medium">Target Company:</span> <span className="font-semibold text-foreground ml-1">{lead.company_name}</span></div>
              </div>
              <div className="p-4 border border-dashed border-border/60 rounded-lg text-center text-xs text-muted-foreground">
                Continuous web tracking is active. Incoming updates regarding executive shifts or announcements will update here automatically.
              </div>
            </TabsContent>
          </Tabs>

        </div>

        {/* 📋 RIGHT SIDE: THE LIGHTWEIGHT HELPER TRAY (RESPONSIVE SIDEBAR) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* QUICK SUMMARY TRAYS */}
          <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm space-y-4 text-xs">
            
            {/* Quick Link: Jump into Relationship Board */}
            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Mapped People ({contacts.length})
              </span>
              <Link 
                href={`/leads/${lead.id}/contacts`}
                className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                Full Directory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Quick Link: Jump into Full History Audit Logs */}
            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" /> Total Logs Logs ({actions.length})
              </span>
              <Link 
                href={`/leads/${lead.id}/activity`}
                className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                Search Activity <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* QUICK PREVIEW CHECKLIST TRACKER */}
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

            {/* LIGHTWEIGHT NOTIFICATION LOG BUCKET */}
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