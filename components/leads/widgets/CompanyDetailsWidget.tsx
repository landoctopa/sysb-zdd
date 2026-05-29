'use client';
// components/leads/widgets/CompanyDetailsWidget.tsx

import React, { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe, Plus, X, Save, Loader2, Building2 } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { Database } from '@/database.types';
import { toast } from 'sonner';

type Lead = Database['public']['Tables']['leads']['Row'];

interface WidgetProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedLead: Lead) => void;
}

const SECTOR_OPTIONS = ['SaaS / Software', 'Fintech', 'Manufacturing', 'Agency / Consulting', 'E-commerce', 'Healthcare', 'Logistics / Supply Chain', 'Other'];
const TARGET_MARKET_OPTIONS = ['SMB', 'Mid-Market', 'Enterprise', 'B2B', 'B2C', 'Local', 'Global'];

export default function CompanyDetailsWidget({ lead, isOpen, onClose, onSaveSuccess }: WidgetProps) {
  const [isSaving, startTransition] = useTransition();

  const [website, setWebsite] = useState(lead.website || '');
  const [linkedin, setLinkedin] = useState(lead.linkedin_url || '');

  const existingDetails = (lead.company_details as Record<string, any>) || {};
  
  const [sector, setSector] = useState<string>(existingDetails.sector || '');
  const [address, setAddress] = useState<string>(existingDetails.address || '');
  const [isPublic, setIsPublic] = useState<boolean>(!!existingDetails.is_public);
  const [employeeCount, setEmployeeCount] = useState<string>(existingDetails.employee_count?.toString() || '');
  
  const [products, setProducts] = useState<string[]>(Array.isArray(existingDetails.products) ? existingDetails.products : []);
  const [newProductInput, setNewProductInput] = useState('');
  const [targetMarket, setTargetMarket] = useState<string[]>(Array.isArray(existingDetails.target_market) ? existingDetails.target_market : []);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanItem = newProductInput.trim();
    if (cleanItem && !products.includes(cleanItem)) {
      setProducts([...products, cleanItem]);
      setNewProductInput('');
    }
  };

  const handleRemoveProduct = (target: string) => {
    setProducts(products.filter(p => p !== target));
  };

  const handleToggleMarket = (market: string) => {
    if (targetMarket.includes(market)) {
      setTargetMarket(targetMarket.filter(m => m !== market));
    } else {
      setTargetMarket([...targetMarket, market]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!website.trim()) {
      toast.error('Please include a company website domain.');
      return;
    }

    const toastId = toast.loading('Saving company updates...');

    startTransition(async () => {
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: website.trim(),
            linkedin_url: linkedin.trim() || null,
            company_details: {
              sector: sector || null,
              products: products,
              target_market: targetMarket,
              address: address.trim() || null,
              is_public: isPublic,
              employee_count: employeeCount ? parseInt(employeeCount, 10) : null
            }
          })
        });

        if (!response.ok) throw new Error('Update failed');
        const updatedLead = await response.json();

        toast.success('Company profile updated!', { id: toastId });
        onSaveSuccess(updatedLead);
        onClose();
      } catch (err) {
        toast.error('Could not save company details.');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 🛠️ UPGRADE: Added responsive max-width layout structure scaling from md to 2xl on desktop views */}
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-xl overflow-y-auto max-h-[90vh] shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <Building2 className="h-4 w-4" /> Company Details
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Fill in or update information regarding the company profile down below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6 text-xs pt-2">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Globe className="h-3 w-3" /> Website Domain *</label>
              <input type="text" placeholder="company.com" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><LinkedInIcon size={12} /> LinkedIn Page URL</label>
              <input type="text" placeholder="linkedin.com/company/name" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Industry Sector</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-2 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving}>
                <option value="">Select Sector...</option>
                {SECTOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employee Count</label>
              <input type="number" placeholder="e.g. 50" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Products / Offerings</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Type a product and hit add..." value={newProductInput} onChange={(e) => setNewProductInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProduct(e))} className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
              <Button type="button" onClick={handleAddProduct} variant="outline" className="h-9 text-xs px-3 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">Add</Button>
            </div>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {products.map(prod => (
                  <span key={prod} className="bg-slate-100 border border-slate-200 text-slate-800 rounded-md px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold">
                    {prod}
                    <X className="h-2.5 w-2.5 cursor-pointer text-slate-400 hover:text-slate-900" onClick={() => handleRemoveProduct(prod)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Market</label>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_MARKET_OPTIONS.map(market => {
                const isActive = targetMarket.includes(market);
                return (
                  <button key={market} type="button" onClick={() => handleToggleMarket(market)} className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`} disabled={isSaving}>
                    {market}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Headquarters Address</label>
            <input type="text" placeholder="City, Country" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={isSaving} />
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg select-none">
            <input type="checkbox" id="widget_is_public" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer" disabled={isSaving} />
            <label htmlFor="widget_is_public" className="font-bold text-slate-700 text-[10px] uppercase tracking-wider cursor-pointer flex-1">This is a publicly traded company</label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-xs hover:bg-slate-50 text-slate-500 font-bold" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 px-4 shadow-sm rounded-md">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Changes
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}