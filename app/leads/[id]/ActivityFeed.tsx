'use client';
// app/leads/[id]/ActivityFeed.tsx
import React from 'react';
import { useStore } from '@nanostores/react';
import { $activeTasks, $activeCommunications } from '@/store/leadsStore';
import {
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildGoogleCalendarUrl } from '@/lib/url-helpers';

const getActivityIcon = (item: any) => {
  if (item.feedType === 'task') {
    if (item.status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <Circle className="h-3.5 w-3.5" />;
  }

  switch (item.type) {
    case 'email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'call':
      return <Phone className="h-3.5 w-3.5" />;
    case 'meeting':
      return <Calendar className="h-3.5 w-3.5" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5" />;
  }
};

const getActivityColor = (item: any) => {
  if (item.feedType === 'task') {
    if (item.status === 'completed') return 'bg-emerald-500/10 text-emerald-400';
    return 'bg-amber-500/10 text-amber-400';
  }
  return 'bg-primary/10 text-primary';
};

export default function ActivityFeed() {
  const tasks = useStore($activeTasks);
  const comms = useStore($activeCommunications || []);

  const timeline = [
    ...(tasks || []).map((t) => ({ ...t, feedType: 'task' })),
    ...(comms || []).map((c) => ({ ...c, feedType: 'comm' })),
  ].sort(
    (a: any, b: any) =>
      new Date(b.due_date || b.created_at).getTime() -
      new Date(a.due_date || a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity Timeline
        </h3>
        {timeline.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {timeline.length}
          </Badge>
        )}
      </div>

      <div className="relative space-y-0">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        {timeline.length === 0 ? (
          <div className="pl-10 py-8 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Log calls, emails, and tasks to track progress
            </p>
          </div>
        ) : (
          timeline.map((item: any, idx: number) => (
            <div
              key={item.id}
              className={`relative pl-10 pb-6 ${idx === timeline.length - 1 ? 'pb-0' : ''}`}
            >
              <div
                className={`absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(
                  item
                )}`}
              >
                {getActivityIcon(item)}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(item.due_date || item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {item.feedType === 'task' && item.status !== 'completed' && (
                      <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20 px-1.5 py-0">
                        Pending
                      </Badge>
                    )}
                    {item.feedType === 'comm' && (
                      <Badge variant="outline" className="text-[9px] capitalize">
                        {item.direction || item.type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.feedType === 'task' && item.status !== 'completed' && item.due_date && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const due = new Date(item.due_date);
                          const end = item.end_date ? new Date(item.end_date) : new Date(due.getTime() + 60*60*1000);
                          const url = buildGoogleCalendarUrl(item.title, due, end, item.description || '');
                          window.open(url, '_blank');
                        }}
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.due_date || item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <h4
                  className={`text-sm font-semibold ${
                    item.status === 'completed'
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {item.title || item.subject || `${item.type || 'Task'} with client`}
                </h4>

                {(item.description || item.content) && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description || item.content}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}