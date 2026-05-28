// app/leads/[id]/activity/page.tsx
import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { 
  ArrowLeft, 
  History, 
  FileText, 
  CheckCircle2, 
  Bell, 
  Calendar,
  Layers,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadActivityPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Fetch the absolute baseline lead data to populate headers
  const { data: lead } = await supabase
    .from('leads')
    .select('id, company_name')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  // 2. Pull down everything that has ever occurred inside your actions table ledger
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  const totalLogs = actions?.length || 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 text-foreground">
      
      {/* SIMPLE BACK-BUTTON HEADER */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <Link 
            href={`/leads/${lead.id}`} 
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 transition-colors group mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transform group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Active Workspace
          </Link>
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> History Log for {lead.company_name}
          </h1>
        </div>
        <Badge variant="outline" className="bg-muted/30 text-muted-foreground font-semibold text-xs py-1 px-2.5">
          {totalLogs} total events recorded
        </Badge>
      </div>

      {/* TIMELINE LIST FEED */}
      {!actions || actions.length === 0 ? (
        <Card className="p-12 text-center text-xs text-muted-foreground border-dashed bg-card">
          No past interactions, notes, or milestones have been logged for this business yet.
        </Card>
      ) : (
        <div className="relative border-l border-border/80 pl-6 ml-3 space-y-6 text-xs">
          {actions.map((act) => {
            // Contextually match layout markers based on polymorphic card types
            const isNote = act.type === 'note';
            const isTask = act.type === 'task';
            const isNotification = act.type === 'notification';

            return (
              <div key={act.id} className="relative space-y-1.5 group animate-fadeIn">
                
                {/* TIMELINE CONNECTOR DOT SWITCHES */}
                <div className={`absolute -left-[31px] top-1 rounded-full h-4 w-4 ring-4 ring-background flex items-center justify-center border shadow-sm ${
                  isNote ? 'bg-amber-500 border-amber-600 text-white' :
                  isTask && act.status === 'completed' ? 'bg-emerald-500 border-emerald-600 text-white' :
                  isTask ? 'bg-blue-500 border-blue-600 text-white' :
                  'bg-muted border-border text-muted-foreground'
                }`}>
                  {isNote && <FileText className="h-2 w-2" />}
                  {isTask && <CheckCircle2 className="h-2 w-2" />}
                  {isNotification && <Bell className="h-2 w-2" />}
                </div>

                {/* LOG ITEM DETAIL ROW CARD */}
                <Card className="border border-border/60 p-4 shadow-sm hover:border-border/100 transition-colors bg-card">
                  <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground text-xs tracking-tight">{act.title}</span>
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 bg-muted/60 text-muted-foreground">
                          Phase: {act.stage}
                        </Badge>
                        {isTask && (
                          <Badge variant={act.status === 'completed' ? 'outline' : 'default'} className={`text-[9px] font-bold px-1.5 py-0 ${act.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-blue-500 text-white'}`}>
                            {act.status === 'completed' ? 'Done' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      
                      {act.body && (
                        <p className="text-muted-foreground leading-relaxed text-[11px] pt-1 whitespace-pre-wrap max-w-2xl">
                          {act.body}
                        </p>
                      )}

                      {/* Display underlying fit check parameters safely if extracted */}
                      {(act.metadata as any)?.score && (
                        <div className="mt-2 p-2 bg-muted/30 border border-border/40 rounded-lg text-[10px] space-y-0.5 max-w-md">
                          <div>🟢 <span className="font-semibold text-muted-foreground">Conversation Fit:</span> <span className="text-foreground font-bold">{(act.metadata as any).score} / 9</span></div>
                          {/* Render financial metrics cleanly in regular prose without LaTeX styling */}
                          {/* render simple variables like 12k or text responses straight */}
                          <div>💰 <span className="font-semibold text-muted-foreground">Financial Impact:</span> <span className="text-foreground font-medium">{(act.metadata as any).financial_impact}</span></div>
                        </div>
                      )}
                    </div>

                    {/* TIMESTAMP FOOTER */}
                    <div className="text-right shrink-0 text-[10px] font-medium text-muted-foreground flex items-center gap-1 self-start sm:self-auto pt-0.5 sm:pt-0 bg-muted/20 sm:bg-transparent px-1.5 py-0.5 sm:p-0 rounded">
                      <Calendar className="h-3 w-3" />
                      {new Date(act.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </Card>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}