'use client';
// components/leads/EngagedStageWorkspace.tsx

import React, { useState, useTransition, useEffect } from 'react';
import { Sparkles, CheckCircle2, HelpCircle, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/database.types';

// 🛠️ Import Decoupled Step Subcomponents 
import Step1FrameworkIntro from './engaged/Step1FrameworkIntro';
import Step2CategorizeResponse from './engaged/Step2CategorizeResponse';
import Step3DeepResearch from './engaged/Step3DeepResearch';
import Step4GenerateReply from './engaged/Step4GenerateReply';
import Step5ScheduleAppointment from './engaged/Step5ScheduleAppointment';

import { IRIS_PLAYBOOK } from '@/lib/iris/playbook.config';

type Lead = Database['public']['Tables']['leads']['Row'];
type Action = Database['public']['Tables']['actions']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface EngagedWorkspaceProps {
  lead: Lead;
  actions: Action[];
  contacts: Contact[];
  onActionUpdated: (action: Action) => void;
  onActionCreated: (action: Action) => void;
  onLeadUpdated: React.Dispatch<React.SetStateAction<Lead>>;
  onContactCreated: (contact: Contact) => void;
  onContactUpdated: (contact: Contact) => void;
  onContactDeleted: (id: string) => void;
}

export default function EngagedStageWorkspace({
  lead,
  actions,
  contacts,
  onActionUpdated,
  onActionCreated,
  onLeadUpdated,
  onContactCreated,
  onContactUpdated,
  onContactDeleted
}: EngagedWorkspaceProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const engagedConfig = IRIS_PLAYBOOK.engaged;

  // Filter and sort tasks from unified polymorphic actions ledger
  const databaseEngagedTasks = actions
    .filter((a) => {
      const meta = (a.metadata as Record<string, any>) || {};
      const taskStage = a.pipeline_stage || meta.stage;
      return a.type === 'task' && taskStage === 'engaged';
    })
    .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));

  // Determine current active task step dynamically on mount
  useEffect(() => {
    if (databaseEngagedTasks.length > 0 && !hasInitializedExpanded) {
      const firstPendingTask = databaseEngagedTasks.find(t => t.status === 'pending');
      if (firstPendingTask) {
        setExpandedTaskId((firstPendingTask.metadata as any)?.task_config_id || null);
      } else {
        setExpandedTaskId('schedule_appointment_gate');
      }
      setHasInitializedExpanded(true);
    }
  }, [actions, hasInitializedExpanded, databaseEngagedTasks]);

  const handleInitializePlaybook = () => {
    if (!engagedConfig) return;

    const payload = engagedConfig.tasks.map(task => {
      return {
        lead_id: lead.id,
        pipeline_stage: 'engaged',
        type: 'task',
        status: 'pending',
        channel: task.channel === 'auto' ? 'email' : 'internal',
        title: task.title,
        body: task.iris_tip,
        required: task.required,
        task_order: task.order,
        metadata: {
          task_config_id: task.id,
          stage: 'engaged'
        }
      };
    });

    startSaveTransition(async () => {
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Seeding failed');
        const generatedList = await response.json();

        if (Array.isArray(generatedList)) {
          generatedList.forEach(act => onActionCreated(act));
        } else {
          onActionCreated(generatedList);
        }
        setExpandedTaskId('engagement_framework_intro');
      } catch (err) {}
    });
  };

  const handleCompleteTask = (task: Action, customMeta: Record<string, any> = {}) => {
    const currentMeta = (task.metadata as Record<string, any>) || {};

    startSaveTransition(async () => {
      try {
        const response = await fetch(`/api/actions/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: { ...currentMeta, ...customMeta }
          }),
        });
        if (!response.ok) throw new Error('Update rejected');
        const updated = await response.json();

        onActionUpdated(updated);

        if (engagedConfig) {
          const nextConfigTask = engagedConfig.tasks.find(t => {
            const match = databaseEngagedTasks.find(db => (db.metadata as any)?.task_config_id === t.id);
            if (match?.id === task.id) return false;
            return !match || match.status === 'pending';
          });
          setExpandedTaskId(nextConfigTask ? nextConfigTask.id : null);
        }
      } catch (err) {}
    });
  };

  if (databaseEngagedTasks.length === 0) {
    return (
      <Card className="p-8 border border-dashed border-primary/30 text-center space-y-4 bg-primary/5 rounded-xl">
        <div className="mx-auto h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-sm font-bold text-foreground">Welcome to the Engaged Playbook</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{engagedConfig?.goal}</p>
        </div>
        <Button onClick={handleInitializePlaybook} disabled={isSaving} className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow px-4 gap-1.5">
          <Play className="h-3.5 w-3.5 fill-current" /> Initialize Engagement Strategy
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {engagedConfig?.tasks.map((playbookTask) => {
        const dbTask = databaseEngagedTasks.find(a => (a.metadata as any)?.task_config_id === playbookTask.id);
        if (!dbTask) return null;

        const configId = playbookTask.id;
        const isCompleted = dbTask.status === 'completed';
        const isExpanded = expandedTaskId === configId;

        return (
          <Card
            key={dbTask.id}
            className={`transition-all duration-200 overflow-hidden ${isExpanded
              ? 'bg-white text-slate-900 border-2 border-slate-900 ring-4 ring-slate-900/5 shadow-md'
              : isCompleted
                ? 'bg-slate-100 border border-slate-200 shadow-sm text-slate-700'
                : 'border-border/60 hover:border-border/100 bg-card text-foreground'
            }`}
          >
            <div
              onClick={() => setExpandedTaskId(isExpanded ? null : configId)}
              className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer select-none ${
                isExpanded ? 'hover:bg-slate-50' : isCompleted ? 'hover:bg-slate-200/60' : 'hover:bg-muted/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className={`h-4 w-4 shrink-0 ${isExpanded ? 'text-slate-900' : 'text-blue-500'}`} />
                )}
                <span className={`font-bold text-xs tracking-tight truncate ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                  {playbookTask.title}
                </span>
              </div>
              <Badge variant="outline" className={`text-[9px] h-5 px-2 font-bold uppercase tracking-wider border-none ${isCompleted ? 'bg-emerald-600/10 text-emerald-700' : isExpanded ? 'bg-slate-900 text-white font-black' : 'bg-muted/40 text-muted-foreground'}`}>
                {isCompleted ? 'Done' : 'Active'}
              </Badge>
            </div>

            {isExpanded && (
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 space-y-4 text-xs animate-fadeIn text-slate-800">
                <div className="flex gap-2.5 leading-relaxed text-slate-600 px-1 font-medium">
                  <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{playbookTask.iris_tip}</span>
                </div>

                {configId === 'engagement_framework_intro' && (
                  <Step1FrameworkIntro
                    dbTask={dbTask}
                    isSaving={isSaving}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'categorize_buyer_response' && (
                  <Step2CategorizeResponse
                    dbTask={dbTask}
                    isSaving={isSaving}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'stakeholder_deep_research' && (
                  <Step3DeepResearch
                    lead={lead}
                    dbTask={dbTask}
                    isSaving={isSaving}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'generate_3_part_reply' && (
                  <Step4GenerateReply
                    lead={lead}
                    dbTask={dbTask}
                    actions={actions}
                    contacts={contacts}
                    isSaving={isSaving}
                    onActionUpdated={onActionUpdated}
                    onCompleteTask={handleCompleteTask}
                  />
                )}

                {configId === 'schedule_appointment_gate' && (
                  <Step5ScheduleAppointment
                    lead={lead}
                    dbTask={dbTask}
                    contacts={contacts}
                    isSaving={isSaving}
                    onCompleteTask={handleCompleteTask}
                    onLeadUpdated={onLeadUpdated}
                  />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}