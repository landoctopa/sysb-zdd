'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SECTORS, EVENT_CATEGORIES } from '@/utils/constants';
import { toast } from 'sonner';
import { Building2, Globe, FileText, Tag, Sparkles, Loader2 } from 'lucide-react';
import { createManualPotential } from '@/app/actions/potentialActions';
import { useRouter } from 'next/navigation';

const getCategoryColorHint = (category: string) => {
  const colors: Record<string, string> = {
    launch: 'bg-emerald-500',
    funding: 'bg-blue-500',
    new_hire: 'bg-purple-500',
    expansion: 'bg-orange-500',
    partnership: 'bg-indigo-500',
    merger_acquisition: 'bg-rose-500',
    regulatory_update: 'bg-amber-500',
  };
  return colors[category] || 'bg-gray-500';
};

export default function ManualSignalModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    description: '',
    company_name: '',
    sectors: [] as string[],
    event_category: 'launch',
    country: 'India',
  });

  const isValid = formData.title.trim() && formData.sectors.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsPending(true);
    try {
      await createManualPotential(formData);
      // The action will redirect, so no further action needed
    } catch (err: any) {
      toast.error(err.message || 'Failed to create potential');
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Manual Potential
          </DialogTitle>
          <DialogDescription>
            Add a custom potential lead. A strategic dossier will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Zomato acquires Blinkit for $500M"
                className="focus-visible:ring-2"
                autoFocus
                required
              />
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
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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
                  onValueChange={(v) => setFormData({ ...formData, sectors: [v] })}
                  value={formData.sectors[0]}
                  required
                >
                  <SelectTrigger className="focus-visible:ring-2">
                    <SelectValue placeholder="Select Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Category */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Event Category</Label>
                <Select
                  onValueChange={(v) => setFormData({ ...formData, event_category: v })}
                  value={formData.event_category}
                >
                  <SelectTrigger className="focus-visible:ring-2">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getCategoryColorHint(c)}`} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com/article"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of why this signal matters..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !isValid} className="min-w-[100px]">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Potential'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}