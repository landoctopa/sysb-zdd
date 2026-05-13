'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activeLead, addTask } from '@/store/leadsStore';
import { toast } from 'sonner';

export function AddTaskModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lead = useStore($activeLead);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lead) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setIsLoading(true);
    try {
      await addTask(lead.id, {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        status: 'pending',
      });
      toast.success('Task added');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      toast.error('Failed to add task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Input placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">{isLoading ? 'Adding...' : 'Add Task'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}