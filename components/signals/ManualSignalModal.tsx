'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SECTORS, EVENT_CATEGORIES } from '@/utils/constants';
import { toast } from 'sonner';
import { Building2, Globe, FileText, Tag, Sparkles, Loader2 } from 'lucide-react';

// Helper to get category color hint
const getCategoryColorHint = (category: string) => {
  const colors: Record<string, string> = {
    'Launch': 'bg-emerald-500',
    'Funding': 'bg-blue-500',
    'New Hire': 'bg-purple-500',
    'Expansion': 'bg-orange-500',
    'Partnership': 'bg-indigo-500',
    'M&A': 'bg-rose-500',
    'Regulatory Update': 'bg-amber-500',
  };
  return colors[category] || 'bg-gray-500';
};

export default function ManualSignalModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    description: '',
    company_name: '',
    sectors: [] as string[],
    event_category: 'Launch',
    country: 'India'
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manual', manual_data: data })
      });
      if (!res.ok) throw new Error('Failed to add signal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Manual signal added to Inbox', {
        description: 'Your signal is now available in the inbox.',
      });
      onOpenChange(false);
      setFormData({ 
        title: '', 
        link: '', 
        description: '', 
        company_name: '', 
        sectors: [], 
        event_category: 'Launch', 
        country: 'India' 
      });
    },
    onError: () => {
      toast.error('Failed to add signal', {
        description: 'Please try again or check your input.',
      });
    }
  });

  const isValid = formData.title.trim() && formData.sectors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Manual Signal
          </DialogTitle>
          <DialogDescription>
            Add a custom signal to your inbox. This will be treated like any other opportunity signal.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => { e.preventDefault(); if (isValid) mutation.mutate(formData); }}>
          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Signal Title <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                placeholder="e.g., Zomato acquires Blinkit for $500M"
                className="focus-visible:ring-2"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">A clear, descriptive title for this signal</p>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company Name
              </Label>
              <Input 
                id="company" 
                value={formData.company_name} 
                onChange={(e) => setFormData({...formData, company_name: e.target.value})} 
                placeholder="e.g., Zomato"
              />
            </div>

            {/* Two Column Layout for Sector & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Main Sector <span className="text-destructive">*</span>
                </Label>
                <Select 
                  onValueChange={(v) => setFormData({...formData, sectors: [v]})}
                  value={formData.sectors[0]}
                >
                  <SelectTrigger className="focus-visible:ring-2">
                    <SelectValue placeholder="Select Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Category */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Event Category</Label>
                <Select 
                  onValueChange={(v) => setFormData({...formData, event_category: v})}
                  value={formData.event_category}
                >
                  <SelectTrigger className="focus-visible:ring-2">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getCategoryColorHint(c)}`} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Category affects signal styling</p>
              </div>
            </div>

            {/* Source URL */}
            <div className="space-y-2">
              <Label htmlFor="link" className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Source URL
              </Label>
              <Input 
                id="link" 
                type="url"
                value={formData.link} 
                onChange={(e) => setFormData({...formData, link: e.target.value})} 
                placeholder="https://example.com/article"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea 
                id="description"
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                placeholder="Brief description of why this signal matters..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => mutation.mutate(formData)} 
              disabled={mutation.isPending || !isValid}
              className="min-w-[100px]"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Inbox'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}