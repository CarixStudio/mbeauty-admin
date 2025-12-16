
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Clock, Mail, CheckCircle, Search, Filter, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Skeleton } from '../components/ui/Skeleton';

export const WaitlistPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchWaitlist = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('product_waitlist')
            .select(`
                *,
                products ( name, image_url ),
                product_variants ( sku )
            `)
            .order('requested_at', { ascending: false });
            
          if (error) throw error;
          setWaitlist(data || []);
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchWaitlist();
  }, []);

  const filteredWaitlist = waitlist.filter(item => 
      item.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNotify = async () => {
      if (selectedItems.length === 0) return;
      
      if (await confirm({
          title: 'Send Restock Notification',
          description: `This will send an email to ${selectedItems.length} customers and mark them as notified. Proceed?`,
          confirmText: 'Send Emails'
      })) {
          try {
              const { error } = await supabase
                .from('product_waitlist')
                .update({ status: 'notified', notified_at: new Date().toISOString() })
                .in('id', selectedItems);

              if (error) throw error;
              
              // Optimistic Update
              setWaitlist(prev => prev.map(item => selectedItems.includes(item.id) ? { ...item, status: 'notified' } : item));
              setSelectedItems([]);
              addToast('Notifications queued successfully', 'success');
          } catch (error: any) {
              addToast(error.message, 'error');
          }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
            <Clock size={24} className="text-brand-accent"/> Waitlist Manager
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Notify customers when products are back in stock.</p>
        </div>
        <div className="flex gap-2">
           {selectedItems.length > 0 && (
              <Button onClick={handleNotify}>
                 <Mail size={16} className="mr-2"/> Notify Selected ({selectedItems.length})
              </Button>
           )}
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
           <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-accent" 
                 placeholder="Search product or customer..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="px-6 py-4 w-4">
                   <input 
                    type="checkbox" 
                    className="rounded w-4 h-4" 
                    onChange={(e) => setSelectedItems(e.target.checked ? filteredWaitlist.filter(i => i.status === 'pending').map(i => i.id) : [])}
                    checked={filteredWaitlist.length > 0 && selectedItems.length === filteredWaitlist.filter(i => i.status === 'pending').length}
                   />
                </th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer Email</th>
                <th className="px-6 py-4">Requested At</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                  Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>)
              ) : filteredWaitlist.length > 0 ? (
                filteredWaitlist.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                        <input 
                            type="checkbox" 
                            className="rounded w-4 h-4 text-brand-primary" 
                            checked={selectedItems.includes(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            disabled={entry.status === 'notified'}
                        />
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                <Package size={14} className="text-gray-400"/>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{entry.products?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {entry.product_variants?.sku}</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{entry.email}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(entry.requested_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                        {entry.status === 'notified' ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit"><CheckCircle size={10}/> Notified</Badge>
                        ) : (
                        <Badge variant="warning" className="flex items-center gap-1 w-fit"><Clock size={10}/> Pending</Badge>
                        )}
                    </td>
                    </tr>
                ))
              ) : (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No waitlist requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
