
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { ShippingRate, UserSession } from '../types';
import { Plus, Edit2, Trash2, Save, X, Globe, Smartphone, Monitor, ShieldAlert, CheckCircle, XCircle, Truck, Users, Settings as SettingsIcon, MapPin, Mail, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';

interface SettingsPageProps {
  activeTab: string;
}

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ activeTab: initialTab }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  
  // Local state for active tab to allow switching within page
  const [currentTab, setCurrentTab] = useState(initialTab || 'shipping');
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------------
  // Shipping State
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [rateForm, setRateForm] = useState<Omit<ShippingRate, 'id'>>({
    name: '',
    country_code: 'US',
    min_order_value: 0,
    rate: 0
  });

  // Sessions State
  const [sessions, setSessions] = useState<UserSession[]>([]);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
      storeName: '',
      supportEmail: '',
      contactPhone: '',
      address: '',
      currency: 'USD',
      timezone: 'America/New_York'
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // ----------------------------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------------------------
  const fetchShippingRates = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.from('shipping_rates').select('*').order('name');
          if (error) throw error;
          setShippingRates(data || []);
      } catch (error: any) {
          addToast('Error loading rates: ' + error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const fetchSessions = async () => {
      setLoading(true);
      try {
          // 1. Fetch Sessions (No Join yet to avoid relationship errors)
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('*')
            .order('last_activity', { ascending: false });
            
          if (sessionsError) throw sessionsError;
          if (!sessionsData || sessionsData.length === 0) {
              setSessions([]);
              return;
          }

          // 2. Manual Join: Fetch Profiles using user_id from sessions
          const userIds = Array.from(new Set(sessionsData.map((s: any) => s.user_id).filter(Boolean)));
          
          let profileMap: Record<string, string> = {};
          
          if (userIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                  .from('admin_profiles')
                  .select('id, full_name')
                  .in('id', userIds);
              
              if (!profilesError && profiles) {
                  profiles.forEach((p: any) => {
                      profileMap[p.id] = p.full_name || 'Unknown';
                  });
              }
          }
          
          const mappedSessions = sessionsData.map((s: any) => ({
              id: s.id,
              user: profileMap[s.user_id] || 'Unknown User', // Map ID to Name
              ip_address: s.ip_address,
              user_agent: s.user_agent,
              is_valid: s.is_valid,
              created_at: s.created_at,
              expires_at: s.expires_at,
              last_activity: new Date(s.last_activity).toLocaleString()
          }));
          
          setSessions(mappedSessions);
      } catch (error: any) {
          console.error("Session fetch error:", error);
          addToast('Error loading sessions: ' + error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const fetchGeneralSettings = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.from('store_settings').select('*');
          if (error) throw error;
          
          // Map DB rows to state object
          const settingsMap: Record<string, string> = {};
          data?.forEach((row: any) => {
              // Handle potential double quotes from JSON stringify
              let val = row.value;
              if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                  val = val.slice(1, -1);
              }
              settingsMap[row.key] = val;
          });

          setGeneralSettings({
              storeName: settingsMap['store_name'] || '',
              supportEmail: settingsMap['support_email'] || '',
              contactPhone: settingsMap['contact_phone'] || '',
              address: settingsMap['store_address'] || '',
              currency: settingsMap['currency'] || 'USD',
              timezone: settingsMap['timezone'] || 'America/New_York'
          });
      } catch (error: any) {
          // Silent fail on first load if table empty
          console.log('Settings load info: ' + error.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (!supabase) return;
      if (currentTab === 'shipping') fetchShippingRates();
      else if (currentTab === 'sessions') fetchSessions();
      else if (currentTab === 'general') fetchGeneralSettings();
  }, [currentTab]);

  // ----------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------
  const handleOpenRateModal = (rate?: ShippingRate) => {
    if (rate) {
      setEditingRate(rate);
      setRateForm({
        name: rate.name,
        country_code: rate.country_code,
        min_order_value: rate.min_order_value,
        rate: rate.rate
      });
    } else {
      setEditingRate(null);
      setRateForm({
        name: '',
        country_code: 'US',
        min_order_value: 0,
        rate: 0
      });
    }
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    try {
        if (editingRate) {
            const { error } = await supabase
                .from('shipping_rates')
                .update(rateForm)
                .eq('id', editingRate.id);
            if (error) throw error;
            await logAuditAction('Update Shipping Rate', rateForm.name);
            addToast("Shipping rate updated", "success");
        } else {
            const { error } = await supabase
                .from('shipping_rates')
                .insert(rateForm);
            if (error) throw error;
            await logAuditAction('Create Shipping Rate', rateForm.name);
            addToast("New shipping rate added", "success");
        }
        setIsRateModalOpen(false);
        fetchShippingRates();
    } catch (error: any) {
        addToast(error.message, 'error');
    }
  };

  const handleDeleteRate = async (id: number) => {
    if (await confirm({ 
        title: 'Delete Shipping Rate', 
        description: 'Are you sure you want to delete this shipping rate?',
        confirmText: 'Delete',
        variant: 'danger'
    })) {
      try {
          const { error } = await supabase.from('shipping_rates').delete().eq('id', id);
          if (error) throw error;
          await logAuditAction('Delete Shipping Rate', `ID: ${id}`);
          setShippingRates(prev => prev.filter(r => r.id !== id));
          addToast("Shipping rate deleted", "info");
      } catch (error: any) {
          addToast(error.message, 'error');
      }
    }
  };

  const handleRevokeSession = async (id: string) => {
    if (await confirm({
        title: 'Revoke Session',
        description: 'Are you sure you want to revoke this session? The user will be logged out immediately.',
        confirmText: 'Revoke',
        variant: 'danger'
    })) {
      try {
          const { error } = await supabase.from('user_sessions').delete().eq('id', id);
          if (error) throw error;
          await logAuditAction('Revoke Session', `ID: ${id}`);
          setSessions(prev => prev.filter(s => s.id !== id));
          addToast("Session revoked successfully", "success");
      } catch (error: any) {
          addToast(error.message, 'error');
      }
    }
  };

  const handleSaveGeneral = async () => {
      setIsSavingGeneral(true);
      try {
          // Upsert array of settings
          const updates = [
              { key: 'store_name', value: JSON.stringify(generalSettings.storeName) },
              { key: 'support_email', value: JSON.stringify(generalSettings.supportEmail) },
              { key: 'contact_phone', value: JSON.stringify(generalSettings.contactPhone) },
              { key: 'store_address', value: JSON.stringify(generalSettings.address) },
              { key: 'currency', value: JSON.stringify(generalSettings.currency) },
              { key: 'timezone', value: JSON.stringify(generalSettings.timezone) }
          ];

          const { error } = await supabase.from('store_settings').upsert(updates, { onConflict: 'key' });
          if (error) throw error;
          
          await logAuditAction('Update General Settings', 'Store Configuration');
          addToast("Store settings saved", "success");
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setIsSavingGeneral(false);
      }
  };

  const getFlag = (code: string) => COUNTRY_OPTIONS.find(c => c.code === code)?.flag || '🏳️';
  const inputClass = "w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none bg-white dark:bg-[#333] text-gray-900 dark:text-white transition-all";

  // Sidebar Menu Items
  const menuItems = [
      { id: 'shipping', label: 'Shipping & Delivery', icon: Truck, desc: 'Manage zones and rates' },
      { id: 'sessions', label: 'Active Sessions', icon: Users, desc: 'Monitor logged-in devices' },
      { id: 'general', label: 'General Settings', icon: SettingsIcon, desc: 'Store details and preferences' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <Card className="w-full lg:w-72 h-fit flex-shrink-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-900 dark:text-white">Store Settings</h2>
            </div>
            <nav className="p-2 space-y-1">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentTab(item.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group ${currentTab === item.id ? 'bg-brand-primary text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                    >
                        <div className={`p-2 rounded-lg ${currentTab === item.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-white'}`}>
                            <item.icon size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-sm">{item.label}</div>
                            <div className={`text-xs mt-0.5 ${currentTab === item.id ? 'text-white/70' : 'text-gray-400'}`}>{item.desc}</div>
                        </div>
                    </button>
                ))}
            </nav>
        </Card>

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2">
            {currentTab === 'shipping' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Shipping Rates</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage delivery zones and costs.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={fetchShippingRates}><RefreshCw size={16}/></Button>
                        <Button onClick={() => handleOpenRateModal()}>
                            <Plus size={18} className="mr-2" /> Add Rate
                        </Button>
                    </div>
                    </div>

                    <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                <tr>
                                <th className="px-6 py-4">Zone Name</th>
                                <th className="px-6 py-4">Country</th>
                                <th className="px-6 py-4">Condition</th>
                                <th className="px-6 py-4">Rate</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div></td></tr>)
                                ) : shippingRates.length > 0 ? (
                                    shippingRates.map(rate => (
                                        <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{rate.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{getFlag(rate.country_code)}</span>
                                                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">{rate.country_code}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {rate.min_order_value > 0 ? `Orders over $${rate.min_order_value}` : 'No minimum'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                {rate.rate === 0 ? <span className="text-green-600 dark:text-green-400">Free</span> : `$${rate.rate.toFixed(2)}`}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenRateModal(rate)}>
                                                    <Edit2 size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRate(rate.id)}>
                                                    <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">No shipping rates defined.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    </Card>
                </div>
            )}

            {currentTab === 'sessions' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">User Sessions</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monitor and manage current user sessions.</p>
                        </div>
                        <Button variant="ghost" onClick={fetchSessions}><RefreshCw size={16}/></Button>
                    </div>

                    <Card>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">IP Address</th>
                                    <th className="px-6 py-4">User Agent</th>
                                    <th className="px-6 py-4">Valid</th>
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4">Last Activity</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div></td></tr>)
                                ) : sessions.length > 0 ? (
                                    sessions.map(sess => (
                                        <tr key={sess.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{sess.user}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{sess.ip_address}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={sess.user_agent}>{sess.user_agent}</td>
                                        <td className="px-6 py-4">
                                            {sess.is_valid ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                                                <CheckCircle size={10}/> Valid
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                                <XCircle size={10}/> Invalid
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(sess.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{sess.last_activity}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/10"
                                                onClick={() => handleRevokeSession(sess.id)}
                                            >
                                                <ShieldAlert size={14} className="mr-1.5"/> Invalidate
                                            </Button>
                                        </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">No active sessions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </Card>
                </div>
            )}

            {currentTab === 'general' && (
                <div className="space-y-6 max-w-4xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">General Settings</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure your store's core details.</p>
                        </div>
                        <Button onClick={handleSaveGeneral} isLoading={isSavingGeneral}>
                            <Save size={16} className="mr-2"/> Save Changes
                        </Button>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Store Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Name</label>
                                    <div className="relative">
                                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input 
                                            className={`${inputClass} pl-9`} 
                                            value={generalSettings.storeName}
                                            onChange={(e) => setGeneralSettings({...generalSettings, storeName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Support Email</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input 
                                            className={`${inputClass} pl-9`} 
                                            value={generalSettings.supportEmail}
                                            onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Support Phone</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input 
                                            className={`${inputClass} pl-9`} 
                                            value={generalSettings.contactPhone}
                                            onChange={(e) => setGeneralSettings({...generalSettings, contactPhone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Currency</label>
                                    <select 
                                        className={inputClass}
                                        value={generalSettings.currency}
                                        onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="NGN">NGN (₦)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Address</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-gray-400"/>
                                    <textarea 
                                        className={`${inputClass} pl-9 resize-none h-24`} 
                                        value={generalSettings.address}
                                        onChange={(e) => setGeneralSettings({...generalSettings, address: e.target.value})}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Regional Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                                    <select 
                                        className={inputClass}
                                        value={generalSettings.timezone}
                                        onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                                    >
                                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Asia/Tokyo">Tokyo</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>

        {/* Create/Edit Rate Modal */}
        {isRateModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingRate ? 'Edit Shipping Rate' : 'Add Shipping Rate'}</h3>
                    <button onClick={() => setIsRateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
                 </div>
                 
                 <form onSubmit={handleSaveRate} className="p-6 space-y-4">
                    <div className="space-y-1">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate Name</label>
                       <input 
                          type="text" 
                          className={inputClass}
                          placeholder="e.g. Standard Shipping"
                          value={rateForm.name} 
                          onChange={e => setRateForm({...rateForm, name: e.target.value})} 
                          required 
                       />
                    </div>
                    
                    <div className="space-y-1">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country / Zone</label>
                       <div className="relative">
                          <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select 
                             className={`${inputClass} pl-9`}
                             value={rateForm.country_code}
                             onChange={e => setRateForm({...rateForm, country_code: e.target.value})}
                          >
                             {COUNTRY_OPTIONS.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                             ))}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min Order ($)</label>
                          <input 
                             type="number" 
                             className={inputClass}
                             min="0"
                             value={rateForm.min_order_value} 
                             onChange={e => setRateForm({...rateForm, min_order_value: Number(e.target.value)})} 
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate Price ($)</label>
                          <input 
                             type="number" 
                             className={inputClass}
                             min="0"
                             step="0.01"
                             value={rateForm.rate} 
                             onChange={e => setRateForm({...rateForm, rate: Number(e.target.value)})} 
                          />
                       </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4">
                       <Button type="button" variant="outline" onClick={() => setIsRateModalOpen(false)}>Cancel</Button>
                       <Button type="submit"><Save size={16} className="mr-2"/> Save Rate</Button>
                    </div>
                 </form>
              </div>
           </div>
        )}
    </div>
  );
};
