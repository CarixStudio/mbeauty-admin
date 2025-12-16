
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DatePicker } from '../components/ui/date-picker';
import { Plus, Edit2, Trash2, X, Save, Monitor, Smartphone, ExternalLink, Ban, Tag, Megaphone, Copy, Eye, Download, Loader2, RefreshCw } from 'lucide-react';
import type { Banner, Promotion, Subscriber } from '../types';
import { Checkbox } from '../components/ui/Checkbox';
import { ImportExportModal } from '../components/ui/ImportExportModal';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';

interface MarketingPageProps {
  activeTab: string;
}

export const MarketingPage: React.FC<MarketingPageProps> = ({ activeTab }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // State for Lists
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Subscriber Selection State
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState<Omit<Banner, 'id'>>({
    content: '',
    link_url: '',
    text_color: '#ffffff',
    background_color: '#67645e',
    is_active: true,
    display_order: 1
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Promotion Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState<Omit<Promotion, 'id' | 'usage_count'>>({
     code: '',
     discount_percentage: 10,
     is_active: true,
     expires_at: '',
     min_order_value: 0,
     is_single_use: false
  });
  const [promoDate, setPromoDate] = useState<Date>();
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  // ----------------------------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------------------------
  
  const fetchBanners = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('promotional_banners')
            .select('*')
            .order('display_order', { ascending: true });
        
        if (error) throw error;
        setBanners(data || []);
    } catch (error: any) {
        addToast('Failed to load banners: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('promotions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        setPromotions(data || []);
    } catch (error: any) {
        addToast('Failed to load promotions: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('subscribers')
            .select('*')
            .order('subscribed_at', { ascending: false });
        
        if (error) throw error;
        setSubscribers(data || []);
    } catch (error: any) {
        addToast('Failed to load subscribers: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      if (activeTab === 'banners') fetchBanners();
      else if (activeTab === 'promotions') fetchPromotions();
      else if (activeTab === 'subscribers') fetchSubscribers();
  }, [activeTab]);

  // ----------------------------------------------------------------------
  // BANNER HANDLERS
  // ----------------------------------------------------------------------
  const handleOpenBannerModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        content: banner.content,
        link_url: banner.link_url,
        text_color: banner.text_color,
        background_color: banner.background_color,
        is_active: banner.is_active,
        display_order: banner.display_order
      });
    } else {
      setEditingBanner(null);
      setBannerForm({
        content: 'Limited Time Offer: Free Shipping',
        link_url: '/shop',
        text_color: '#ffffff',
        background_color: '#67645e',
        is_active: true,
        display_order: banners.length + 1
      });
    }
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSavingBanner(true);
    try {
        if (editingBanner) {
            const { error } = await supabase
                .from('promotional_banners')
                .update(bannerForm)
                .eq('id', editingBanner.id);
            if (error) throw error;
            addToast('Banner updated successfully', 'success');
        } else {
            const { error } = await supabase
                .from('promotional_banners')
                .insert(bannerForm);
            if (error) throw error;
            addToast('Banner created successfully', 'success');
        }
        setIsBannerModalOpen(false);
        fetchBanners();
    } catch (error: any) {
        addToast(error.message, 'error');
    } finally {
        setIsSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!supabase) return;
    if (await confirm({ title: 'Delete Banner', description: 'Are you sure?', variant: 'danger' })) {
        try {
            const { error } = await supabase.from('promotional_banners').delete().eq('id', id);
            if (error) throw error;
            setBanners(prev => prev.filter(b => b.id !== id));
            addToast('Banner deleted', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }
  };

  const toggleBannerActive = async (id: string, currentState: boolean) => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('promotional_banners')
            .update({ is_active: !currentState })
            .eq('id', id);
        
        if (error) throw error;
        setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentState } : b));
        addToast(`Banner ${!currentState ? 'activated' : 'deactivated'}`, 'success');
    } catch (error: any) {
        addToast(error.message, 'error');
    }
  };

  // ----------------------------------------------------------------------
  // PROMOTION HANDLERS
  // ----------------------------------------------------------------------
  const handleOpenPromoModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoForm({
        code: promo.code,
        discount_percentage: promo.discount_percentage,
        is_active: promo.is_active,
        expires_at: promo.expires_at,
        min_order_value: promo.min_order_value || 0,
        is_single_use: promo.is_single_use || false
      });
      setPromoDate(new Date(promo.expires_at));
    } else {
      setEditingPromo(null);
      const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setPromoForm({
        code: '',
        discount_percentage: 10,
        is_active: true,
        expires_at: defaultDate.toISOString(),
        min_order_value: 0,
        is_single_use: false
      });
      setPromoDate(defaultDate);
    }
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setIsSavingPromo(true);
    const finalData = {
        ...promoForm,
        expires_at: promoDate ? promoDate.toISOString() : promoForm.expires_at
    };

    try {
        if (editingPromo) {
            const { error } = await supabase
                .from('promotions')
                .update(finalData)
                .eq('id', editingPromo.id);
            if (error) throw error;
            addToast('Promotion updated successfully', 'success');
        } else {
            const { error } = await supabase
                .from('promotions')
                .insert(finalData);
            if (error) throw error;
            addToast('Promotion created successfully', 'success');
        }
        setIsPromoModalOpen(false);
        fetchPromotions();
    } catch (error: any) {
        addToast(error.message, 'error');
    } finally {
        setIsSavingPromo(false);
    }
  };

  const handleDeactivatePromo = async (id: string) => {
     if (!supabase) return;
     try {
         const { error } = await supabase.from('promotions').update({ is_active: false }).eq('id', id);
         if (error) throw error;
         setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
         addToast('Promotion deactivated', 'info');
     } catch (error: any) {
         addToast(error.message, 'error');
     }
  };

  const handleDeletePromo = async (id: string) => {
    if (!supabase) return;
    if (await confirm({ title: 'Delete Promotion', description: 'Are you sure you want to delete this promotion permanently?', variant: 'danger' })) {
        try {
            const { error } = await supabase.from('promotions').delete().eq('id', id);
            if (error) throw error;
            setPromotions(prev => prev.filter(p => p.id !== id));
            addToast('Promotion deleted', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }
  };

  // ----------------------------------------------------------------------
  // SUBSCRIBER HANDLERS
  // ----------------------------------------------------------------------
  const handleSelectAllSubscribers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSubscribers(subscribers.map(s => s.id));
    } else {
      setSelectedSubscribers([]);
    }
  };

  const handleSelectSubscriber = (id: string) => {
    if (selectedSubscribers.includes(id)) {
      setSelectedSubscribers(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedSubscribers(prev => [...prev, id]);
    }
  };

  const handleRemoveSubscriber = async (id: string) => {
    if (!supabase) return;
    if (await confirm({ title: 'Unsubscribe', description: 'Remove this subscriber from the list?', variant: 'danger' })) {
       try {
           const { error } = await supabase.from('subscribers').delete().eq('id', id);
           if (error) throw error;
           setSubscribers(prev => prev.filter(s => s.id !== id));
           setSelectedSubscribers(prev => prev.filter(sid => sid !== id));
           addToast('Subscriber removed', 'success');
       } catch (error: any) {
           addToast(error.message, 'error');
       }
    }
  };

  const handleBulkRemoveSubscribers = async () => {
    if (selectedSubscribers.length === 0 || !supabase) return;
    if (await confirm({ title: 'Bulk Remove', description: `Are you sure you want to remove ${selectedSubscribers.length} subscribers?`, variant: 'danger' })) {
        try {
            const { error } = await supabase.from('subscribers').delete().in('id', selectedSubscribers);
            if (error) throw error;
            setSubscribers(prev => prev.filter(s => !selectedSubscribers.includes(s.id)));
            setSelectedSubscribers([]);
            addToast('Subscribers removed', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }
  };

  // ----------------------------------------------------------------------
  // RENDER: BANNERS TAB
  // ----------------------------------------------------------------------
  if (activeTab === 'banners') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Promotional Banners</h1>
             <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage announcements and top-bar notifications.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchBanners}><RefreshCw size={16}/></Button>
            <Button onClick={() => handleOpenBannerModal()} title="Create new banner">
                <Plus size={18} className="mr-2" /> Create Banner
            </Button>
          </div>
        </div>

        <Card>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                       <th className="px-6 py-4">Preview</th>
                       <th className="px-6 py-4">Colors</th>
                       <th className="px-6 py-4">Active</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                    ) : banners.length > 0 ? banners.map(banner => (
                       <tr key={banner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4">
                             <div 
                                className="px-4 py-2 rounded text-xs font-medium text-center truncate max-w-[200px] md:max-w-[300px]"
                                style={{ backgroundColor: banner.background_color, color: banner.text_color }}
                             >
                                {banner.content}
                             </div>
                             <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <ExternalLink size={10} /> {banner.link_url}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" style={{ backgroundColor: banner.background_color }} title="Background"></div>
                                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" style={{ backgroundColor: banner.text_color }} title="Text"></div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div 
                                onClick={() => toggleBannerActive(banner.id, banner.is_active)}
                                className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${banner.is_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                             >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${banner.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenBannerModal(banner)}>
                                   <Edit2 size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteBanner(banner.id)}>
                                   <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                                </Button>
                             </div>
                          </td>
                       </tr>
                    )) : (
                       <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No banners created.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </Card>

        {/* Live Preview Modal */}
        {isBannerModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[600px] animate-in zoom-in-95 duration-200 border dark:border-gray-700">
                 {/* Form Side */}
                 <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingBanner ? 'Edit Banner' : 'New Banner'}</h3>
                       <button onClick={() => setIsBannerModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"/></button>
                    </div>
                    <form id="bannerForm" onSubmit={handleSaveBanner} className="space-y-4 flex-1">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Message Content</label>
                           <textarea className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none bg-white dark:bg-[#333] text-gray-900 dark:text-white" rows={3} value={bannerForm.content} onChange={e => setBannerForm({...bannerForm, content: e.target.value})} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Link URL</label>
                           <input type="text" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={bannerForm.link_url} onChange={e => setBannerForm({...bannerForm, link_url: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Background</label>
                              <div className="flex gap-2">
                                 <input type="color" className="w-10 h-10 p-1 rounded border cursor-pointer" value={bannerForm.background_color} onChange={e => setBannerForm({...bannerForm, background_color: e.target.value})} />
                                 <input type="text" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={bannerForm.background_color} onChange={e => setBannerForm({...bannerForm, background_color: e.target.value})} />
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Text Color</label>
                              <div className="flex gap-2">
                                 <input type="color" className="w-10 h-10 p-1 rounded border cursor-pointer" value={bannerForm.text_color} onChange={e => setBannerForm({...bannerForm, text_color: e.target.value})} />
                                 <input type="text" className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={bannerForm.text_color} onChange={e => setBannerForm({...bannerForm, text_color: e.target.value})} />
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                           <label className="text-sm font-medium dark:text-gray-300">Active Status</label>
                           <div 
                              onClick={() => setBannerForm({...bannerForm, is_active: !bannerForm.is_active})}
                              className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${bannerForm.is_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                           >
                              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${bannerForm.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                           </div>
                        </div>
                    </form>
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                       <Button type="submit" form="bannerForm" className="w-full" isLoading={isSavingBanner}><Save size={16} className="mr-2"/> Save Banner</Button>
                    </div>
                 </div>
                 
                 {/* Preview Side */}
                 <div className="w-full md:w-2/3 bg-gray-100 dark:bg-[#1a1a1a] flex flex-col hidden md:flex">
                     <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#262626] flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Eye size={14}/> Live Preview</span>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                           <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-primary dark:text-white' : 'text-gray-400'}`}><Monitor size={16}/></button>
                           <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-primary dark:text-white' : 'text-gray-400'}`}><Smartphone size={16}/></button>
                        </div>
                     </div>
                     <div className="flex-1 p-8 flex items-start justify-center overflow-auto">
                        <div 
                           className={`bg-white shadow-2xl transition-all duration-300 flex flex-col ${previewMode === 'mobile' ? 'w-[375px] h-[667px] rounded-2xl border-4 border-gray-800' : 'w-full h-full rounded-md border border-gray-200'}`}
                        >
                           {/* Simulated Site Header with Banner */}
                           <div className="w-full">
                              <div 
                                 className="w-full py-2 px-4 text-center text-sm font-medium transition-colors"
                                 style={{ backgroundColor: bannerForm.background_color, color: bannerForm.text_color }}
                              >
                                 {bannerForm.content || 'Banner content will appear here'}
                              </div>
                              <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
                                 <div className="w-24 h-6 bg-gray-200 rounded"></div>
                                 <div className="flex gap-4">
                                    <div className="w-16 h-4 bg-gray-100 rounded"></div>
                                    <div className="w-16 h-4 bg-gray-100 rounded"></div>
                                 </div>
                              </div>
                              <div className="h-64 bg-gray-50 m-6 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                                 Site Content Placeholder
                              </div>
                           </div>
                        </div>
                     </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: PROMOTIONS TAB
  // ----------------------------------------------------------------------
  if (activeTab === 'promotions') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Promotions & Coupons</h1>
               <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage discount codes and sales campaigns.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={fetchPromotions}><RefreshCw size={16}/></Button>
                <Button onClick={() => handleOpenPromoModal()} title="Create new promotion">
                <Plus size={18} className="mr-2" /> Create Promotion
                </Button>
            </div>
         </div>

         <Card>
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                     <tr>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Discount</th>
                        <th className="px-6 py-4">Rules</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Expires</th>
                        <th className="px-6 py-4">Usage</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                     {loading ? (
                        <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                     ) : promotions.length > 0 ? promotions.map(promo => (
                        <tr key={promo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Tag size={16} className="text-brand-accent" />
                                 <span className="font-mono font-bold text-gray-900 dark:text-white">{promo.code}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 font-medium dark:text-gray-200">{promo.discount_percentage}% OFF</td>
                           <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                              {promo.min_order_value ? `Min $${promo.min_order_value}` : 'No Min'}
                              {promo.is_single_use && <span className="block text-amber-600 dark:text-amber-400">Single Use</span>}
                           </td>
                           <td className="px-6 py-4">
                              <Badge variant={promo.is_active ? 'success' : 'secondary'}>{promo.is_active ? 'Active' : 'Inactive'}</Badge>
                           </td>
                           <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(promo.expires_at).toLocaleDateString()}</td>
                           <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{promo.usage_count} uses</td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 {promo.is_active && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDeactivatePromo(promo.id)} title="Deactivate">
                                       <Ban size={16} className="text-amber-500" />
                                    </Button>
                                 )}
                                 <Button variant="ghost" size="sm" onClick={() => handleOpenPromoModal(promo)} title="Edit">
                                    <Edit2 size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleDeletePromo(promo.id)} title="Delete">
                                    <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     )) : (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">No active promotions.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </Card>

         {/* Promo Modal */}
         {isPromoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingPromo ? 'Edit Promotion' : 'New Promotion'}</h3>
                     <button onClick={() => setIsPromoModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSavePromo} className="p-6 space-y-4">
                     <div className="space-y-1">
                        <label className="text-sm font-medium dark:text-gray-300">Coupon Code</label>
                        <div className="relative">
                           <Megaphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input 
                              type="text" 
                              className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 rounded-lg uppercase font-mono tracking-wide focus:ring-1 focus:ring-brand-accent outline-none bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                              placeholder="e.g. SUMMER20"
                              value={promoForm.code} 
                              onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} 
                              required 
                           />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-sm font-medium dark:text-gray-300">Discount Percentage</label>
                        <div className="flex items-center gap-2">
                           <input 
                              type="number" 
                              className="w-24 p-2 border dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-brand-accent outline-none bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                              min="1" max="100" 
                              value={promoForm.discount_percentage} 
                              onChange={e => setPromoForm({...promoForm, discount_percentage: Number(e.target.value)})} 
                              required 
                           />
                           <span className="text-gray-500 dark:text-gray-400">%</span>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-sm font-medium dark:text-gray-300">Expiration Date</label>
                        <DatePicker date={promoDate} setDate={setPromoDate} className="w-full" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-sm font-medium dark:text-gray-300">Min Order ($)</label>
                           <input 
                              type="number" 
                              className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                              min="0"
                              value={promoForm.min_order_value} 
                              onChange={e => setPromoForm({...promoForm, min_order_value: Number(e.target.value)})} 
                           />
                        </div>
                        <div className="flex items-center pt-6">
                           <Checkbox 
                              label="Single Use per User" 
                              checked={promoForm.is_single_use || false} 
                              onChange={checked => setPromoForm({...promoForm, is_single_use: checked})} 
                           />
                        </div>
                     </div>
                     <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-sm font-medium dark:text-gray-300">Active Status</label>
                        <div 
                           onClick={() => setPromoForm({...promoForm, is_active: !promoForm.is_active})}
                           className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${promoForm.is_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                           <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${promoForm.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                     </div>
                     
                     <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsPromoModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSavingPromo}><Save size={16} className="mr-2"/> Save Promotion</Button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: SUBSCRIBERS TAB
  // ----------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Newsletter Subscribers</h1>
             <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">View and export email marketing opt-ins.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" onClick={fetchSubscribers}><RefreshCw size={16}/></Button>
             <Button variant="outline" onClick={() => setIsExportOpen(true)}>
                <Download size={16} className="mr-2"/> Export CSV
             </Button>
             {selectedSubscribers.length > 0 && (
                <Button variant="danger" onClick={handleBulkRemoveSubscribers}>
                   <Trash2 size={16} className="mr-2"/> Remove ({selectedSubscribers.length})
                </Button>
             )}
          </div>
       </div>

       <Card>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                   <tr>
                      <th className="px-6 py-4 w-4">
                         <input 
                            type="checkbox" 
                            className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary w-4 h-4"
                            onChange={handleSelectAllSubscribers}
                            checked={subscribers.length > 0 && selectedSubscribers.length === subscribers.length}
                         />
                      </th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Subscribed Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                   {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                   ) : subscribers.length > 0 ? subscribers.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                         <td className="px-6 py-4">
                            <input 
                               type="checkbox" 
                               className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary w-4 h-4"
                               checked={selectedSubscribers.includes(sub.id)}
                               onChange={() => handleSelectSubscriber(sub.id)}
                            />
                         </td>
                         <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{sub.email}</td>
                         <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                         <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSubscriber(sub.id)} title="Remove">
                               <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                            </Button>
                         </td>
                      </tr>
                   )) : (
                       <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No subscribers yet.</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </Card>

       <ImportExportModal 
          isOpen={isExportOpen} 
          onClose={() => setIsExportOpen(false)} 
          type="export" 
          entityName="Subscribers" 
        />
    </div>
  );
};
