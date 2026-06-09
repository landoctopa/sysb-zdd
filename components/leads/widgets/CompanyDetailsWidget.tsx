'use client';
// components/leads/widgets/CompanyDetailsWidget.tsx

import React, { useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe, Plus, X, Save, Loader2, Building2, Sparkles, ShieldCheck } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/LinkedIn';
import { createClient } from '@/utils/supabase/client';
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
  const [isSaving, startSaveTransition] = useTransition();
  const [isEnriching, startEnrichTransition] = useTransition();
  const supabase = createClient();

  // Membership Evaluation State Check
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // Core Flat Base Properties
  const [companyName, setCompanyName] = useState(lead.company_name || '');
  const [website, setWebsite] = useState(lead.website || '');
  const [linkedin, setLinkedin] = useState(lead.linkedin_url || '');

  // Internal JSON Details Vault Properties
  const existingDetails = (lead.company_details as Record<string, any>) || {};
  const [legalName, setLegalName] = useState<string>(existingDetails.legal_name || '');
  const [tagline, setTagline] = useState<string>(existingDetails.tagline || '');
  const [description, setDescription] = useState<string>(existingDetails.description || '');
  const [sector, setSector] = useState<string>(existingDetails.sector || '');
  const [address, setAddress] = useState<string>(existingDetails.address || '');
  const [isPublic, setIsPublic] = useState<boolean>(!!existingDetails.is_public);
  const [employeeCount, setEmployeeCount] = useState<string>(existingDetails.employee_count?.toString() || '');
  const [followerCount, setFollowerCount] = useState<string>(existingDetails.follower_count?.toString() || '');
  const [companyType, setCompanyType] = useState<string>(existingDetails.company_type || '');
  const [foundedYear, setFoundedYear] = useState<string>(existingDetails.founded_year?.toString() || '');
  
  const [products, setProducts] = useState<string[]>(Array.isArray(existingDetails.products) ? existingDetails.products : []);
  const [newProductInput, setNewProductInput] = useState('');
  const [targetMarket, setTargetMarket] = useState<string[]>(Array.isArray(existingDetails.target_market) ? existingDetails.target_market : []);

  // Look up workspace membership verification flags on open
  useEffect(() => {
    async function checkUserTier() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
        if (data?.is_premium) setIsPremium(true);
      }
    }
    if (isOpen) checkUserTier();
  }, [isOpen]);

  // Synchronize component states dynamically if lead updates outside or via enrichment
  useEffect(() => {
    setCompanyName(lead.company_name || '');
    setWebsite(lead.website || '');
    setLinkedin(lead.linkedin_url || '');
    const details = (lead.company_details as Record<string, any>) || {};
    setLegalName(details.legal_name || '');
    setTagline(details.tagline || '');
    setDescription(details.description || '');
    setSector(details.sector || '');
    setAddress(details.address || '');
    setIsPublic(!!details.is_public);
    setEmployeeCount(details.employee_count?.toString() || '');
    setFollowerCount(details.follower_count?.toString() || '');
    setCompanyType(details.company_type || '');
    setFoundedYear(details.founded_year?.toString() || '');
    setProducts(Array.isArray(details.products) ? details.products : []);
    setTargetMarket(Array.isArray(details.target_market) ? details.target_market : []);
  }, [lead, isOpen]);

  // 💎 APIFY PREMIUM ENRICHMENT HANDLER
  const handleTriggerApifyEnrichment = async () => {
    if (!linkedin.trim() || !linkedin.includes('linkedin.com/')) {
      toast.error('Please input a valid company LinkedIn page URL link first.');
      return;
    }

    const toastId = toast.loading('Iris is running Apify data enrichment sweeps...');
    startEnrichTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}/enrich/company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkedinUrl: linkedin.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Enrichment run failed');

        toast.success('Company intelligence updated successfully!', { id: toastId });
        onSaveSuccess(data);
      } catch (err: any) {
        toast.error(err.message || 'Could not enrich company details automatically.', { id: toastId });
      }
    });
  };

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

    startSaveTransition(async () => {
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName.trim() || null,
            website: website.trim(),
            linkedin_url: linkedin.trim() || null,
            company_details: {
              ...existingDetails,
              legal_name: legalName.trim() || null,
              tagline: tagline.trim() || null,
              description: description.trim() || null,
              sector: sector || null,
              products: products,
              target_market: targetMarket,
              address: address.trim() || null,
              is_public: isPublic,
              employee_count: employeeCount ? parseInt(employeeCount, 10) : null,
              follower_count: followerCount ? parseInt(followerCount, 10) : null,
              company_type: companyType || null,
              founded_year: foundedYear ? parseInt(foundedYear, 10) : null
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

  const UI_PENDING = isSaving || isEnriching;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-slate-900 border-2 border-slate-900 w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-xl overflow-y-auto max-h-[90vh] shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <Building2 className="h-4 w-4" /> Company Profile Builder
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500 font-medium">
            Verify key account attributes. Enriched data cascades automatically into downstream research variant metrics.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-5 text-xs pt-2">
          
          {/* Base Verification Fields */}
          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-500">Core Identity Handles</h4>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Company Trading Name *</label>
              <input type="text" placeholder="e.g. Netflix" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-white border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1"><Globe className="h-3 w-3" /> Website Domain *</label>
                <input type="text" placeholder="company.com" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full bg-white border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1"><LinkedInIcon size={12} /> LinkedIn Page URL</label>
                <input type="text" placeholder="https://linkedin.com/company/handle" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full bg-white border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
            </div>

            {/* 💎 CONTEXTUAL UPGRADE OR ACTION INTERACTIVE BANNER */}
            {linkedin.trim().includes('linkedin.com/company/') && (
              <div className="pt-2 border-t border-slate-200/60 mt-2 animate-fadeIn">
                {isPremium ? (
                  <Button
                    type="button"
                    disabled={UI_PENDING}
                    onClick={handleTriggerApifyEnrichment}
                    className="w-full h-8 text-[11px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5 rounded-md shadow"
                  >
                    {isEnriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {isEnriching ? 'Fetching Company Details...' : 'Get Company Details'}
                  </Button>
                ) : (
                  <div className="p-2.5 bg-blue-500/5 border border-dashed border-blue-400/40 rounded-md text-[11px] text-blue-900 font-medium leading-relaxed flex items-center justify-between gap-4 select-none">
                    <span>💡 <strong>Want to avoid manual entry?</strong> Pro subscription plans auto-populate company headers, follower counts, and legal summaries using Apify tokens instantly.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Enriched Fields Layout View */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 border-b pb-1">Firmographic Deep Profile Fields</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Legal Name</label>
                <input type="text" placeholder="e.g. Netflix, Inc." value={legalName} onChange={(e) => setLegalName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company Structure / Type</label>
                <input type="text" placeholder="e.g. Public Company / Private Partnership" value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Corporate Tagline</label>
              <input type="text" placeholder="Short positioning hook statement..." value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detailed Business Overview Description</label>
              <textarea rows={3} placeholder="Full description details..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium resize-none leading-relaxed" disabled={UI_PENDING} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Industry Sector</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-2 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING}>
                  <option value="">Select Sector...</option>
                  {SECTOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employee Headcount</label>
                <input type="number" placeholder="e.g. 50" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">LinkedIn Followers</label>
                <input type="number" placeholder="e.g. 12500" value={followerCount} onChange={(e) => setFollowerCount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Headquarters Headquarters Address</label>
                <input type="text" placeholder="City, Country" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Founded Year</label>
                <input type="number" placeholder="e.g. 1997" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Products / Offerings</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Type a product and hit add..." value={newProductInput} onChange={(e) => setNewProductInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProduct(e))} className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3 h-9 rounded-md focus:outline-none focus:border-slate-900 text-slate-900 font-medium" disabled={UI_PENDING} />
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Market Dimension</label>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_MARKET_OPTIONS.map(market => {
                  const isActive = targetMarket.includes(market);
                  return (
                    <button key={market} type="button" onClick={() => handleToggleMarket(market)} className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`} disabled={UI_PENDING}>
                      {market}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg select-none">
              <input type="checkbox" id="widget_is_public" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer" disabled={UI_PENDING} />
              <label htmlFor="widget_is_public" className="font-bold text-slate-700 text-[10px] uppercase tracking-wider cursor-pointer flex-1">This is a publicly traded corporate entity</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-xs hover:bg-slate-50 text-slate-500 font-bold" disabled={UI_PENDING}>Cancel</Button>
            <Button type="submit" disabled={UI_PENDING} className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 px-4 shadow-sm rounded-md">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Complete Profile
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}