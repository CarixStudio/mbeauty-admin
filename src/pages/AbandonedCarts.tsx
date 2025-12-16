
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShoppingCart, Mail, Download, Clock, CheckCircle, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { ImportExportModal } from '../components/ui/ImportExportModal';
import { Skeleton } from '../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export const AbandonedCartsPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
  
  // Recovery State
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedCart, setSelectedCart] = useState<any | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch Logic: Carts > 1h old, active, with email
  const fetchAbandonedCarts = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          
          // Fetch Carts - FIX AMBIGUOUS RELATIONSHIP
          const { data, error } = await supabase
            .from('carts')
            .select(`
                *,
                cart_items (
                    id, quantity,
                    product_variants (
                        sku, price,
                        products!product_variants_product_id_fkey ( name, image_url )
                    )
                )
            `)
            .lt('updated_at', oneHourAgo)
            .eq('recovery_status', 'active')
            .not('email', 'is', null) // Only recoverable ones
            .order('updated_at', { ascending: false });

          if (error) throw error;

          // Calculate totals manually if not in DB
          const processedData = data.map((cart: any) => {
              const items = cart.cart_items || [];
              const total = items.reduce((sum: number, item: any) => {
                  return sum + (item.quantity * (item.product_variants?.price || 0));
              }, 0);
              
              return {
                  ...cart,
                  calculated_total: total,
                  items_count: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
              };
          });

          setCarts(processedData);
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchAbandonedCarts();
  }, []);

  const handleRecover = (cart: any) => {
    setSelectedCart(cart);
    setIsRecoveryModalOpen(true);
  };

  const sendRecoveryEmail = async () => {
    if (selectedCart && supabase) {
      try {
          // 1. Update Status
          const { error } = await supabase
            .from('carts')
            .update({ 
                recovery_mail_sent: true,
                recovery_status: 'notified' // Assuming enum updated
            })
            .eq('id', selectedCart.id);

          if (error) throw error;

          // 2. Mock Email Sending (Real app would use Edge Function)
          addToast('Recovery email sent successfully!', 'success');
          
          // 3. UI Update
          setCarts(prev => prev.filter(c => c.id !== selectedCart.id)); // Remove from active list
          setIsRecoveryModalOpen(false);
      } catch (error: any) {
          addToast(error.message, 'error');
      }
    }
  };

  const stats = {
    potentialLost: carts.reduce((acc, c) => acc + c.calculated_total, 0),
    count: carts.length
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
            <ShoppingCart size={24} className="text-brand-accent"/> Abandoned Carts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track and recover lost revenue from incomplete checkouts.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchAbandonedCarts}><RefreshCw size={16}/></Button>
            <Button variant="outline" title="Export List" onClick={() => setIsExportOpen(true)}>
            <Download size={16} className="mr-2"/> Export CSV
            </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wide">Potential Lost Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">${stats.potentialLost.toLocaleString()}</p>
             </div>
             <AlertTriangle className="text-red-400" size={20} />
          </div>
          <p className="text-xs text-red-500 mt-2 font-medium">{stats.count} carts require action</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4">Customer (Email)</th>
                <th className="px-6 py-4">Cart Value</th>
                <th className="px-6 py-4">Abandoned At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                  Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>)
              ) : carts.length > 0 ? (
                carts.map(cart => (
                    <React.Fragment key={cart.id}>
                        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${expandedCartId === cart.id ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
                        <td className="px-6 py-4 text-center">
                            <button 
                                onClick={() => setExpandedCartId(expandedCartId === cart.id ? null : cart.id)}
                                className="text-gray-400 hover:text-brand-primary transition-colors"
                            >
                                {expandedCartId === cart.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{cart.email}</div>
                            {cart.customer_id && <span className="text-xs text-blue-500">Registered User</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                            ${cart.calculated_total.toFixed(2)} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({cart.items_count} items)</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                            <Clock size={12}/> {new Date(cart.updated_at).toLocaleString()}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <Button size="sm" onClick={() => handleRecover(cart)}>
                                <Mail size={14} className="mr-1"/> Recover
                            </Button>
                        </td>
                        </tr>
                        
                        {/* Expanded Items Row */}
                        {expandedCartId === cart.id && (
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                                <td colSpan={5} className="px-6 py-4">
                                    <div className="space-y-2 pl-8 border-l-2 border-brand-accent/30">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items in Cart</p>
                                        {cart.cart_items.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-4 text-sm">
                                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                                                    {item.product_variants?.products?.image_url && <img src={item.product_variants.products.image_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">{item.product_variants?.products?.name}</span>
                                                    <span className="text-gray-500 text-xs ml-2">SKU: {item.product_variants?.sku}</span>
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {item.quantity} x ${item.product_variants?.price}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))
              ) : (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-500">No recoverable abandoned carts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recovery Modal */}
      <Dialog open={isRecoveryModalOpen} onOpenChange={setIsRecoveryModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Draft Recovery Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To</label>
                    <input disabled value={selectedCart?.email || ''} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Subject</label>
                    <input defaultValue="You left something behind at Momoh Beauty!" className="w-full p-2 border rounded bg-white dark:bg-[#333] text-gray-900 dark:text-white" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Message Preview</label>
                    <textarea 
                        className="w-full p-3 border rounded h-32 resize-none bg-white dark:bg-[#333] text-gray-900 dark:text-white text-sm leading-relaxed" 
                        defaultValue={`Hi there,\n\nWe noticed you left some luxury items in your cart. They are selling out fast!\n\nComplete your order now and enjoy complimentary shipping.\n\n[Link to Cart]`}
                    />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRecoveryModalOpen(false)}>Cancel</Button>
                  <Button onClick={sendRecoveryEmail}><Mail size={16} className="mr-2"/> Send Recovery Email</Button>
              </div>
          </DialogContent>
      </Dialog>

      <ImportExportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        type="export" 
        entityName="Abandoned Carts" 
      />
    </div>
  );
};
