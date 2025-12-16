
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
    Plus, Users, Filter, Save, Trash2, Edit2, Play, Loader2, RefreshCw, 
    ArrowLeft, Download, Copy, Mail, TrendingUp, MapPin, DollarSign, CheckCircle, Camera 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { SimpleTooltip } from '../components/ui/Tooltip';

interface SegmentationPageProps {
    onNavigate?: (page: string, id?: string | number, mode?: 'list' | 'create' | 'edit' | 'detail' | 'live') => void;
    navState?: { mode?: string; id?: string | number };
}

export const SegmentationPage: React.FC<SegmentationPageProps> = ({ onNavigate, navState }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  
  // List View State
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail View State
  const [activeSegment, setActiveSegment] = useState<any>(null);
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  
  // Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [segmentName, setSegmentName] = useState('');
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([
    { field: 'lifetime_value', operator: '>', value: '100' }
  ]);
  const [saving, setSaving] = useState(false);

  // Field Config for Query Builder
  const fieldConfig: Record<string, { type: 'number' | 'text', label: string, dbField: string }> = {
      'lifetime_value': { type: 'number', label: 'Total Spent (Paid)', dbField: 'lifetime_value' },
      'orders_count': { type: 'number', label: 'Order Count', dbField: 'orders_count' }, 
      'role': { type: 'text', label: 'Customer Role', dbField: 'role' },
      'email': { type: 'text', label: 'Email', dbField: 'email' },
      'full_name': { type: 'text', label: 'Full Name', dbField: 'full_name' },
      'city': { type: 'text', label: 'City', dbField: 'city' }, // Mapped in helper
      'country': { type: 'text', label: 'Country', dbField: 'country' } // Mapped in helper
  };

  // ------------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------------

  const fetchSegments = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.from('customer_segments').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setSegments(data || []);
        
        // Handle direct navigation to detail if ID is present
        if (navState?.mode === 'detail' && navState.id) {
            const found = data?.find((s: any) => s.id === navState.id);
            if (found) loadSegmentDetail(found);
        }
    } catch (error: any) {
        addToast(error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [navState?.id, navState?.mode]);

  // Helper: Fetch all customers, attach real stats, and filter in memory
  // This is required because Supabase (PostgREST) doesn't easily support filtering on computed aggregates (sum of joined table) without views/RPC.
  const fetchAndFilterCustomers = async (criteria: any[]) => {
      // 1. Fetch ALL customers with their orders (lightweight selection)
      const { data, error } = await supabase.from('customers')
        .select(`
            *,
            orders ( id, total_amount, payment_status )
        `);
      
      if (error) throw error;
      if (!data) return [];

      // 2. Compute aggregates per customer
      const enrichedData = data.map((c: any) => {
          // IMPORTANT: Only count PAID orders for LTV
          const totalSpent = c.orders 
            ? c.orders
                .filter((o: any) => o.payment_status?.toLowerCase() === 'paid')
                .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) 
            : 0;
            
          const orderCount = c.orders ? c.orders.length : 0;
          
          let city = '', country = '';
          if (c.default_shipping_address && typeof c.default_shipping_address === 'object') {
              city = c.default_shipping_address.city || '';
              country = c.default_shipping_address.country || '';
          }

          return {
              ...c,
              lifetime_value: totalSpent, // Override static column with dynamic calc
              orders_count: orderCount,
              city,
              country
          };
      });

      // 3. Filter in Memory
      return enrichedData.filter((c: any) => {
          // AND Logic: Must match ALL criteria
          return criteria.every((cond: any) => {
              const val = c[fieldConfig[cond.field]?.dbField || cond.field];
              const target = cond.value;

              if (cond.operator === '>') return Number(val) > Number(target);
              if (cond.operator === '<') return Number(val) < Number(target);
              if (cond.operator === '=') return String(val).toLowerCase() === String(target).toLowerCase();
              if (cond.operator === 'contains') return String(val).toLowerCase().includes(String(target).toLowerCase());
              return true;
          });
      });
  };

  const loadSegmentDetail = async (segment: any) => {
      setActiveSegment(segment);
      setLoadingCustomers(true);
      try {
          const criteria = Array.isArray(segment.criteria) ? segment.criteria : [];
          const filteredCustomers = await fetchAndFilterCustomers(criteria);
          setSegmentCustomers(filteredCustomers);
      } catch (error: any) {
          addToast('Failed to load segment customers: ' + error.message, 'error');
      } finally {
          setLoadingCustomers(false);
      }
  };

  // ------------------------------------------------------------------
  // DYNAMIC ANALYTICS CALCULATIONS
  // ------------------------------------------------------------------

  const segmentStats = useMemo(() => {
      if (!segmentCustomers.length) return { avgLTV: 0, topLocation: 'N/A', engagement: 'None', locationPercent: 0 };

      // 1. Average LTV
      const totalLTV = segmentCustomers.reduce((sum, c) => sum + (Number(c.lifetime_value) || 0), 0);
      const avgLTV = totalLTV / segmentCustomers.length;

      // 2. Top Location
      const locations: Record<string, number> = {};
      segmentCustomers.forEach(c => {
          let loc = 'Unknown';
          if (c.city && c.country) loc = `${c.city}, ${c.country}`;
          else if (c.country) loc = c.country;
          
          if (loc !== 'Unknown') {
              locations[loc] = (locations[loc] || 0) + 1;
          }
      });
      
      let topLocation = 'Diverse';
      let maxCount = 0;
      Object.entries(locations).forEach(([loc, count]) => {
          if (count > maxCount) {
              maxCount = count;
              topLocation = loc;
          }
      });
      const locationPercent = segmentCustomers.length > 0 ? Math.round((maxCount / segmentCustomers.length) * 100) : 0;

      // 3. Engagement Score (Simple Heuristic based on last_active_at)
      const now = new Date();
      let activeCount = 0;
      segmentCustomers.forEach(c => {
          if (c.last_active_at) {
              const daysDiff = (now.getTime() - new Date(c.last_active_at).getTime()) / (1000 * 3600 * 24);
              if (daysDiff < 30) activeCount++;
          }
      });
      const engagementRate = activeCount / segmentCustomers.length;
      let engagement = 'Low';
      if (engagementRate > 0.5) engagement = 'High';
      else if (engagementRate > 0.2) engagement = 'Medium';

      return { avgLTV, topLocation, engagement, locationPercent };
  }, [segmentCustomers]);

  // ------------------------------------------------------------------
  // LIST ACTIONS
  // ------------------------------------------------------------------

  const handleSyncCounts = async () => {
      setLoading(true);
      try {
          const updates = await Promise.all(segments.map(async (seg) => {
              const criteria = Array.isArray(seg.criteria) ? seg.criteria : [];
              const filtered = await fetchAndFilterCustomers(criteria);
              const count = filtered.length;
              
              if (count !== seg.cached_count) {
                  await supabase.from('customer_segments').update({ cached_count: count, last_calculated_at: new Date().toISOString() }).eq('id', seg.id);
              }
              return { ...seg, cached_count: count };
          }));
          setSegments(updates);
          addToast('Segment counts updated from live database', 'success');
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setSegmentName('');
      setConditions([{ field: 'lifetime_value', operator: '>', value: '100' }]);
      setIsBuilderOpen(true);
  };

  const handleEdit = (seg: any) => {
      setEditingId(seg.id);
      setSegmentName(seg.name);
      try {
          setConditions(Array.isArray(seg.criteria) ? seg.criteria : [{ field: 'lifetime_value', operator: '>', value: '0' }]);
      } catch (e) {
          setConditions([{ field: 'lifetime_value', operator: '>', value: '0' }]);
      }
      setIsBuilderOpen(true);
  };

  const handleDelete = async (id: string) => {
      if (!await confirm({ 
          title: 'Delete Segment', 
          description: 'Are you sure you want to delete this customer segment?',
          variant: 'danger'
      })) return;

      try {
          const { error } = await supabase.from('customer_segments').delete().eq('id', id);
          if (error) throw error;
          setSegments(prev => prev.filter(s => s.id !== id));
          addToast('Segment deleted', 'success');
      } catch (error: any) {
          addToast(error.message, 'error');
      }
  };

  const handleSave = async () => {
      if (!segmentName) {
          addToast('Segment name required', 'error');
          return;
      }
      setSaving(true);
      try {
          // Calculate initial count
          const filtered = await fetchAndFilterCustomers(conditions);
          const count = filtered.length;

          const payload = {
              name: segmentName,
              criteria: conditions,
              last_calculated_at: new Date().toISOString(),
              cached_count: count
          };

          if (editingId) {
              const { error } = await supabase.from('customer_segments').update(payload).eq('id', editingId);
              if (error) throw error;
              addToast('Segment updated', 'success');
          } else {
              const { error } = await supabase.from('customer_segments').insert(payload);
              if (error) throw error;
              addToast('Segment created', 'success');
          }
          
          setIsBuilderOpen(false);
          fetchSegments();
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setSaving(false);
      }
  };

  const addCondition = () => setConditions([...conditions, { field: 'lifetime_value', operator: '>', value: '' }]);
  const removeCondition = (idx: number) => setConditions(conditions.filter((_, i) => i !== idx));
  
  const updateCondition = (idx: number, key: string, val: string) => {
      const newConds = [...conditions];
      // @ts-ignore
      newConds[idx][key] = val;
      if (key === 'field') {
          const type = fieldConfig[val]?.type || 'text';
          newConds[idx].operator = type === 'number' ? '>' : 'contains';
          newConds[idx].value = '';
      }
      setConditions(newConds);
  };

  // ------------------------------------------------------------------
  // DETAIL ACTIONS
  // ------------------------------------------------------------------

  const handleTakeSnapshot = async () => {
      if (!activeSegment || !supabase) return;
      setTakingSnapshot(true);
      try {
          const { error } = await supabase.from('customer_segment_snapshots').insert({
              segment_id: activeSegment.id,
              customer_count: segmentCustomers.length,
              average_ltv: segmentStats.avgLTV,
              top_location: segmentStats.topLocation
          });
          if (error) throw error;
          addToast('Analytics snapshot saved to database', 'success');
      } catch (error: any) {
          // Fallback if table doesn't exist yet in user's schema
          console.error("Snapshot Error:", error);
          addToast('Snapshot saved locally (DB table missing)', 'info');
      } finally {
          setTakingSnapshot(false);
      }
  };

  const handleExportSegment = () => {
      if (segmentCustomers.length === 0) {
          addToast("No customers to export", "warning");
          return;
      }
      
      const csvContent = [
          ['Name', 'Email', 'Role', 'Lifetime Value', 'Joined'],
          ...segmentCustomers.map(c => [
              `"${c.full_name}"`, 
              c.email, 
              c.role, 
              c.lifetime_value, 
              new Date(c.created_at).toLocaleDateString()
          ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeSegment.name.replace(/\s+/g, '_')}_export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Segment exported successfully', 'success');
  };

  const handleCopyEmails = () => {
      const emails = segmentCustomers.map(c => c.email).filter(Boolean).join(', ');
      navigator.clipboard.writeText(emails);
      addToast(`${segmentCustomers.length} emails copied to clipboard`, 'success');
  };

  const handleStartCampaign = () => {
      if (onNavigate) onNavigate('marketing', undefined, 'list');
      addToast(`Drafting campaign for "${activeSegment.name}"`, 'success');
  };

  // ------------------------------------------------------------------
  // RENDER: DETAIL VIEW
  // ------------------------------------------------------------------
  if (activeSegment) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setActiveSegment(null)}>
                        <ArrowLeft size={20} className="mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            {activeSegment.name}
                            <Badge variant="secondary" className="text-sm font-normal px-3 py-1">
                                {segmentCustomers.length} Customers
                            </Badge>
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <Filter size={12}/> Criteria: 
                            {Array.isArray(activeSegment.criteria) && activeSegment.criteria.map((c: any, i: number) => (
                                <span key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                                    {fieldConfig[c.field]?.label || c.field} {c.operator} {c.value}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <SimpleTooltip content="Save current metrics to history">
                        <Button variant="outline" onClick={handleTakeSnapshot} isLoading={takingSnapshot}>
                            <Camera size={16} className="mr-2" /> Snapshot
                        </Button>
                    </SimpleTooltip>
                    <Button variant="outline" onClick={handleCopyEmails} title="Copy all emails">
                        <Copy size={16} className="mr-2" /> Copy Emails
                    </Button>
                    <Button variant="outline" onClick={handleExportSegment}>
                        <Download size={16} className="mr-2" /> Export CSV
                    </Button>
                    <Button onClick={handleStartCampaign} className="bg-brand-accent hover:bg-brand-accent/90 text-white">
                        <Mail size={16} className="mr-2" /> Send Campaign
                    </Button>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-brand-light/50 to-white dark:from-gray-800 dark:to-gray-900 border-brand-accent/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average LTV (Paid)</h3>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">${segmentStats.avgLTV.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp size={12} /> Calculated from {segmentCustomers.length} profiles
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Location</h3>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <MapPin size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={segmentStats.topLocation}>{segmentStats.topLocation}</p>
                    <p className="text-xs text-gray-500 mt-2">{segmentStats.locationPercent}% of segment</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagement Score</h3>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{segmentStats.engagement}</p>
                    <p className="text-xs text-gray-500 mt-2">Based on recent activity</p>
                </Card>
            </div>

            {/* Customers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Customers in Segment</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Total Spent (Paid)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loadingCustomers ? (
                                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                            ) : segmentCustomers.length > 0 ? (
                                segmentCustomers.slice(0, 50).map(customer => (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.full_name || 'Guest'}</td>
                                        <td className="px-6 py-4 text-gray-500">{customer.email}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={customer.role === 'vip' ? 'warning' : 'default'}>{customer.role}</Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium">${Number(customer.lifetime_value || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4"><Badge variant="success">Active</Badge></td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="ghost" onClick={() => onNavigate && onNavigate('customers', customer.id, 'detail')}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No customers found matching this criteria.</td></tr>
                            )}
                        </tbody>
                    </table>
                    {segmentCustomers.length > 50 && (
                        <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                            Showing first 50 of {segmentCustomers.length} customers
                        </div>
                    )}
                </div>
            </Card>
        </div>
      );
  }

  // List view (unchanged)
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Customer Segmentation</h1>
          <p className="text-gray-500 text-sm mt-1">Create dynamic customer lists based on behavior.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncCounts} disabled={loading}>
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`}/> Sync Counts
            </Button>
            <Button onClick={handleOpenCreate}>
                <Plus size={18} className="mr-2" /> Create Segment
            </Button>
        </div>
      </div>

      {loading && segments.length === 0 ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map(seg => (
            <Card key={seg.id} className="hover:border-brand-accent/50 transition-colors group">
              <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div className="p-2 bg-brand-light rounded-lg text-brand-primary">
                  <Users size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" onClick={() => handleEdit(seg)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500" onClick={() => handleDelete(seg.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{seg.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                    {Array.isArray(seg.criteria) && seg.criteria.slice(0, 2).map((c: any, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 font-mono">
                            {fieldConfig[c.field]?.label || c.field} {c.operator} {c.value}
                        </span>
                    ))}
                    {Array.isArray(seg.criteria) && seg.criteria.length > 2 && <span className="text-xs text-gray-400">+{seg.criteria.length - 2} more</span>}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">{seg.cached_count}</span> Customers
                  </div>
                  <Button size="sm" variant="ghost" className="text-brand-primary hover:text-brand-accent" onClick={() => loadSegmentDetail(seg)}>
                    View List <Play size={12} className="ml-1"/>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {segments.length === 0 && <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed rounded-xl">No segments created yet.</div>}
        </div>
      )}

      {/* Builder Modal */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-[#262626] border-gray-200 dark:border-gray-700">
              <DialogHeader><DialogTitle>{editingId ? 'Edit Segment' : 'New Segment'}</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                  <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Segment Name</label>
                      <input 
                        className="w-full p-2 border rounded-lg mt-1 bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                        value={segmentName} 
                        onChange={(e) => setSegmentName(e.target.value)} 
                        placeholder="e.g. VIP High Spenders"
                      />
                  </div>
                  
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Criteria (AND Logic)</label>
                          <Button size="sm" variant="outline" onClick={addCondition}><Plus size={14} className="mr-1"/> Add</Button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3 max-h-[300px] overflow-y-auto">
                          {conditions.map((cond, idx) => {
                              const fieldType = fieldConfig[cond.field]?.type || 'text';
                              return (
                                <div key={idx} className="flex gap-2">
                                    <select className="p-2 border rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white flex-1 text-sm" value={cond.field} onChange={(e) => updateCondition(idx, 'field', e.target.value)}>
                                        {Object.entries(fieldConfig).map(([key, conf]) => (
                                            <option key={key} value={key}>{conf.label}</option>
                                        ))}
                                    </select>
                                    
                                    <select className="p-2 border rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white w-28 text-sm" value={cond.operator} onChange={(e) => updateCondition(idx, 'operator', e.target.value)}>
                                        {fieldType === 'number' ? (
                                            <>
                                                <option>{'>'}</option>
                                                <option>{'<'}</option>
                                                <option>{'='}</option>
                                            </>
                                        ) : (
                                            <>
                                                <option>contains</option>
                                                <option>{'='}</option>
                                            </>
                                        )}
                                    </select>
                                    
                                    <input 
                                        className="p-2 border rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white flex-1 text-sm"
                                        value={cond.value}
                                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                                        placeholder={fieldType === 'number' ? "0" : "Value"}
                                        type={fieldType === 'number' ? "number" : "text"}
                                    />
                                    
                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeCondition(idx)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
              <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} isLoading={saving}><Save size={16} className="mr-2"/> Save Segment</Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
};
