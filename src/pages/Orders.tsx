
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, Eye, MoreHorizontal, Printer, ArrowLeft, Trash2, Edit2, Calendar, CreditCard, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, XCircle, Mail, Phone, MapPin, Truck, Clock, RotateCcw, User, FileText, Tag, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DatePicker } from '../components/ui/date-picker';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { SimpleTooltip } from '../components/ui/Tooltip';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { OrderPrintView } from '../components/OrderPrintView';
import { CloudinaryOptimizer } from '../lib/cloudinary';
import { logAuditAction } from '../lib/audit';
import { useOrder } from '../lib/hooks';
import { OrderUpdateSchema } from '../lib/schemas';

interface OrdersPageProps {
  navState: { mode?: string; id?: string | number };
  onNavigate: (page: string, id?: string | number, mode?: 'list' | 'detail') => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ navState, onNavigate }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // List View State
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Selection & Modals
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  // Print & Export State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState<'invoice' | 'label' | null>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);

  // Detail View State (Using SWR)
  const orderId = navState.mode === 'detail' ? navState.id?.toString() : null;
  const { data: detailOrderData, error: detailError, mutate: mutateOrder } = useOrder(orderId || '');
  const [newNote, setNewNote] = useState('');

  // Transform Detail Data for UI if loaded
  const detailOrder = detailOrderData ? {
      id: detailOrderData.id,
      displayId: detailOrderData.order_number || `#${detailOrderData.id.substring(0,8)}`,
      customer: detailOrderData.customers?.full_name || 'Guest',
      email: detailOrderData.customers?.email,
      shipping_address: typeof detailOrderData.shipping_address === 'string' 
          ? JSON.parse(detailOrderData.shipping_address) 
          : detailOrderData.shipping_address || detailOrderData.customers?.default_shipping_address,
      total: detailOrderData.total_amount,
      status: (detailOrderData.status || 'pending').charAt(0).toUpperCase() + (detailOrderData.status || 'pending').slice(1),
      payment: detailOrderData.payment_status || 'Pending',
      date: detailOrderData.created_at,
      updated_at: detailOrderData.updated_at, // IMPORTANT FOR OCC
      line_items: detailOrderData.order_items.map((item: any) => ({
          id: item.id,
          product: item.product_name || item.product_variants?.products?.name || 'Unknown Product',
          variant: item.variant_name || 'Standard',
          sku: item.sku || 'N/A',
          price: item.price_at_purchase,
          quantity: item.quantity,
          image: CloudinaryOptimizer.url(item.product_image_url || item.product_variants?.products?.image_url, { width: 100, crop: 'fill' })
      })),
      timeline: detailOrderData.order_events.map((e: any) => ({
          status: e.status,
          date: e.created_at,
          description: e.description
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      notes: detailOrderData.order_notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } : null;

  // Fetch Orders (List View)
  const fetchOrders = useCallback(async () => {
    if (!supabase) return; // Safety check
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers!inner ( full_name, email )
        `, { count: 'exact' });

      // Apply Filters
      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter.toLowerCase()); 
      }
      
      if (paymentFilter !== 'All') {
        query = query.eq('payment_status', paymentFilter);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }

      if (searchTerm) {
        const term = `%${searchTerm}%`;
        query = query.or(`order_number.ilike.${term},customers.full_name.ilike.${term},customers.email.ilike.${term}`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Map DB structure to UI structure
      const mappedOrders = (data || []).map((o: any) => ({
        id: o.id, // Keep UUID for operations
        displayId: o.order_number || `#${o.id.substring(0,8).toUpperCase()}`,
        customer: o.customers?.full_name || 'Guest',
        email: o.customers?.email || 'No email',
        total: o.total_amount,
        status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
        date: o.created_at,
        payment: o.payment_status || 'Pending',
        shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address, // Needed for printing later
      }));

      setOrders(mappedOrders);
      setTotalCount(count || 0);

    } catch (error: any) {
      console.error('Error fetching orders:', error);
      addToast('Failed to load orders: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, startDate, endDate, searchTerm, currentPage, itemsPerPage, addToast]);

  // Initial Fetch
  useEffect(() => {
    if (!navState.mode || navState.mode === 'list') {
        fetchOrders();
    }
  }, [fetchOrders, navState.mode]);

  // Actions
  const handleBulkAction = async (action: string) => {
     if (selectedOrders.length === 0) return;

     const confirmed = await confirm({
        title: `Bulk ${action}`,
        description: `Are you sure you want to ${action} ${selectedOrders.length} orders?`,
        confirmText: 'Yes, proceed',
        variant: action === 'Delete' ? 'danger' : 'default'
     });

     if (confirmed) {
        try {
            if (action === 'Delete') {
                await supabase.from('orders').delete().in('id', selectedOrders);
                await logAuditAction('Bulk Delete Orders', `${selectedOrders.length} orders deleted`);
            } else if (action === 'Mark as Processing') {
                await supabase.from('orders').update({ status: 'processing' }).in('id', selectedOrders);
                await logAuditAction('Bulk Status Update', `Set ${selectedOrders.length} orders to Processing`);
            } else if (action === 'Mark as Shipped') {
                await supabase.from('orders').update({ status: 'shipped' }).in('id', selectedOrders);
                await logAuditAction('Bulk Status Update', `Set ${selectedOrders.length} orders to Shipped`);
            }
            
            addToast(`${action} successful`, 'success');
            fetchOrders(); // Refresh list
            setSelectedOrders([]);
        } catch (error) {
            addToast('Action failed', 'error');
        }
     }
  };

  const handleUpdateStatus = async (newStatus: string) => {
      if (!detailOrder) return;
      const dbStatus = newStatus.toLowerCase();
      
      // Zod Validation
      const validation = OrderUpdateSchema.safeParse({ status: dbStatus, updated_at: detailOrder.updated_at });
      if (!validation.success) {
          addToast('Invalid status update: ' + validation.error.message, 'error');
          return;
      }

      try {
          // Optimistic Concurrency Control
          // We check if updated_at matches. 
          const { data, error } = await supabase
            .from('orders')
            .update({ status: dbStatus })
            .eq('id', detailOrder.id)
            .eq('updated_at', detailOrder.updated_at) // OCC Check
            .select();

          if (error) throw error;
          
          if (!data || data.length === 0) {
              // Conflict!
              addToast('Update failed: The order was modified by someone else. Refreshing...', 'error');
              mutateOrder(); // Reload data
              return;
          }
          
          await supabase.from('order_events').insert({
              order_id: detailOrder.id,
              status: dbStatus,
              description: `Status manually updated to ${newStatus}`
          });

          await logAuditAction('Update Order Status', `Order ${detailOrder.displayId}`, { from: detailOrder.status, to: newStatus });

          mutateOrder(); // Refresh local SWR cache
          addToast(`Order marked as ${newStatus}`, 'success');
      } catch (error) {
          addToast('Failed to update status', 'error');
      }
  };

  const handleAddNote = async () => {
      if (!newNote.trim() || !detailOrder) return;
      try {
          const { data, error } = await supabase.from('order_notes').insert({
              order_id: detailOrder.id,
              note: newNote,
          }).select().single();

          if (error) throw error;

          await logAuditAction('Add Order Note', `Order ${detailOrder.displayId}`);
          mutateOrder(); // Refresh data to see note
          setNewNote('');
          addToast('Note added', 'success');
      } catch (error) {
          addToast('Failed to add note', 'error');
      }
  };

  // --- Real Export Functionality ---
  const handleExportCSV = () => {
    if (orders.length === 0) {
        addToast('No orders to export', 'warning');
        return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Email', 'Total', 'Payment Status', 'Fulfillment Status'];
    const csvRows = [
        headers.join(','), // Header row
        ...orders.map(o => {
            return [
                o.displayId,
                new Date(o.date).toISOString().split('T')[0],
                `"${o.customer.replace(/"/g, '""')}"`, // Escape quotes
                o.email,
                o.total,
                o.payment,
                o.status
            ].join(',');
        })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logAuditAction('Export Orders', 'CSV Export Generated');
    addToast('Orders exported successfully', 'success');
  };

  // --- Print Handlers ---
  const handlePrint = (type: 'invoice' | 'label') => {
      // If we are in detail view, use that order. If in list view, use selected (limit to 1 for MVP or first selected)
      const targetOrder = detailOrder || (selectedOrders.length === 1 ? orders.find(o => o.id === selectedOrders[0]) : null);
      
      if (!targetOrder) {
          addToast('Please select a single order to print.', 'warning');
          return;
      }

      setPrintType(type);
      setPrintOrder(targetOrder);
      setIsPrintModalOpen(true);
  };

  const executeBrowserPrint = () => {
      // Use CSS to hide everything except the print-area div
      const printContent = document.getElementById('print-area');
      if (!printContent) return;
      
      // Inject print styles temporarily
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
      window.print();
      document.head.removeChild(style);
  };

  // Helper for checkbox selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.checked) setSelectedOrders(orders.map(o => o.id));
     else setSelectedOrders([]);
  };

  const handleSelectOne = (id: string) => {
     if (selectedOrders.includes(id)) setSelectedOrders(selectedOrders.filter(oid => oid !== id));
     else setSelectedOrders([...selectedOrders, id]);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ----------------------------------------------------------------------
  // VIEW: LIST
  // ----------------------------------------------------------------------
  if (!navState.mode || navState.mode === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit" title="Orders List">Orders List</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage orders, track fulfillment, and handle refunds.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <SimpleTooltip content="Export filtered orders">
                <Button variant="outline" onClick={handleExportCSV} title="Export to CSV">
                <Download size={16} className="mr-2"/> Export CSV
                </Button>
            </SimpleTooltip>
            {/* Quick Print for Single Selection */}
            {selectedOrders.length === 1 && (
                <SimpleTooltip content="Print Label">
                    <Button variant="outline" onClick={() => handlePrint('label')} title="Print Label">
                    <Tag size={16} className="mr-2"/> Print Label
                    </Button>
                </SimpleTooltip>
            )}
          </div>
        </div>

        <Card className="p-4 space-y-4">
           {/* Filters UI ... (Unchanged) */}
           <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="Search Order #, Customer Name..." 
                   className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none bg-white dark:bg-[#333333] text-gray-900 dark:text-white"
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                   onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
                 />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center min-w-[300px]">
                 <DatePicker date={startDate} setDate={(d) => { setStartDate(d); setCurrentPage(1); }} placeholder="Start Date" className="w-full sm:w-auto" />
                 <span className="text-gray-400 hidden sm:inline">-</span>
                 <DatePicker date={endDate} setDate={(d) => { setEndDate(d); setCurrentPage(1); }} placeholder="End Date" className="w-full sm:w-auto" />
              </div>
           </div>

           <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar">
                 {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                        statusFilter === status 
                          ? 'bg-brand-primary text-white border-brand-primary dark:bg-gray-200 dark:text-gray-900' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {status}
                    </button>
                 ))}
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                 <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Payment:</span>
                 <select 
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-brand-accent bg-white dark:bg-[#333333] text-gray-900 dark:text-white"
                    value={paymentFilter}
                    onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
                 >
                    <option value="All">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                 </select>
              </div>
           </div>
        </Card>

        {selectedOrders.length > 0 && (
           <div className="bg-brand-light dark:bg-gray-800 border border-brand-accent/20 dark:border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between animate-in fade-in slide-in-from-top-2 gap-3">
               <div className="flex items-center gap-2">
                  <span className="bg-brand-primary dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-2 py-0.5 rounded">{selectedOrders.length}</span>
                  <span className="text-sm font-medium text-brand-primary dark:text-white">orders selected</span>
               </div>
               <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Mark as Processing')}>Mark Processing</Button>
                  <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Mark as Shipped')}>Mark Shipped</Button>
                  <Button size="sm" variant="outline" className="bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-gray-700 dark:text-red-400 dark:border-red-900/50" onClick={() => handleBulkAction('Delete')}>Delete</Button>
               </div>
           </div>
        )}

        <div className="flex flex-col">
          {/* Desktop Table View */}
          <Card className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="p-4 w-4">
                      <input 
                          type="checkbox" 
                          className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary w-4 h-4"
                          onChange={handleSelectAll}
                          checked={orders.length > 0 && selectedOrders.length === orders.length}
                      />
                    </th>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                      Array(5).fill(0).map((_, i) => (
                          <tr key={i}>
                              <td colSpan={8} className="p-4"><Skeleton className="h-8 w-full" /></td>
                          </tr>
                      ))
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${selectedOrders.includes(order.id) ? 'bg-brand-light/30 dark:bg-gray-800' : ''}`}>
                        <td className="p-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary w-4 h-4" 
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOne(order.id)}
                            />
                        </td>
                        <td className="px-6 py-4 font-medium text-brand-primary dark:text-white cursor-pointer hover:underline" onClick={() => onNavigate('orders', order.id, 'detail')}>
                          {order.displayId}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col cursor-pointer group">
                              <span className="text-gray-900 dark:text-white font-medium group-hover:text-brand-accent transition-colors">{order.customer}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">{order.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">${Number(order.total).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={order.payment === 'Paid' ? 'success' : order.payment === 'Pending' ? 'warning' : 'default'}>{order.payment}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={order.status === 'Delivered' ? 'success' : order.status === 'Pending' ? 'warning' : order.status === 'Cancelled' ? 'error' : 'secondary'}>{order.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => onNavigate('orders', order.id, 'detail')} title="View Details">
                              <Eye size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500 dark:text-gray-400">
                          No orders found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {loading ? <Skeleton className="h-32 w-full" /> : 
             orders.length > 0 ? orders.map(order => (
              <Card key={order.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-brand-primary dark:text-white text-lg block mb-1" onClick={() => onNavigate('orders', order.id, 'detail')}>{order.displayId}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={order.status === 'Delivered' ? 'success' : order.status === 'Pending' ? 'warning' : order.status === 'Cancelled' ? 'error' : 'secondary'}>{order.status}</Badge>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Customer</span>
                    <span className="font-medium text-gray-900 dark:text-white">{order.customer}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</span>
                    <span className="font-bold text-gray-900 dark:text-white">${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                   <Badge variant={order.payment === 'Paid' ? 'success' : order.payment === 'Pending' ? 'warning' : 'default'}>{order.payment}</Badge>
                   <Button variant="outline" size="sm" onClick={() => onNavigate('orders', order.id, 'detail')}>View Details</Button>
                </div>
              </Card>
            )) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#262626] rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  No orders found.
              </div>
            )}
          </div>

          <div className="p-4 md:border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-[#262626] rounded-b-xl md:rounded-t-none">
             <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <select 
                   className="border border-gray-200 dark:border-gray-600 rounded p-1 text-sm bg-white dark:bg-[#333] focus:border-brand-accent outline-none text-gray-900 dark:text-white"
                   value={itemsPerPage}
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                   <option value={10}>10</option>
                   <option value={25}>25</option>
                   <option value={50}>50</option>
                   <option value={100}>100</option>
                </select>
                <span className="ml-2 hidden sm:inline">
                   Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </span>
             </div>

             <div className="flex gap-1">
                <Button 
                   variant="outline" 
                   size="sm" 
                   disabled={currentPage === 1}
                   onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                   <ChevronLeft size={16} />
                </Button>
                <span className="flex items-center px-2 text-sm font-medium">Page {currentPage} of {Math.max(1, totalPages)}</span>
                <Button 
                   variant="outline" 
                   size="sm"
                   disabled={currentPage >= totalPages}
                   onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                   <ChevronRight size={16} />
                </Button>
             </div>
          </div>
        </div>

        {/* Print Modal */}
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex justify-between items-center">
                        <span>Print {printType === 'invoice' ? 'Invoice' : 'Label'}</span>
                        <div className="flex gap-2">
                            <Button onClick={executeBrowserPrint}>
                                <Printer size={16} className="mr-2"/> Print / Download PDF
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto bg-gray-100 p-8">
                    {printOrder && <OrderPrintView order={printOrder} type={printType!} />}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: DETAIL
  // ----------------------------------------------------------------------
  if (navState.mode === 'detail' && navState.id) {
    if (!detailOrderData && !detailError) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-4">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!detailOrder || detailError) return <div className="p-8 text-center text-gray-500">Order not found or error loading</div>;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
           {/* Back and Title */}
           <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => onNavigate('orders', undefined, 'list')} className="hidden sm:flex">
                 <ArrowLeft size={20} className="mr-2"/> Back
              </Button>
              <div>
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    Order {detailOrder.displayId}
                    <Badge variant={detailOrder.status === 'Delivered' ? 'success' : detailOrder.status === 'Pending' ? 'warning' : 'default'}>
                       {detailOrder.status}
                    </Badge>
                 </h1>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Placed on {new Date(detailOrder.date).toLocaleString()}
                 </p>
              </div>
           </div>

           {/* Action Buttons */}
           <div className="flex gap-2">
              <Button variant="outline" onClick={() => handlePrint('invoice')}>
                 <Printer size={16} className="mr-2"/> Print Invoice
              </Button>
              <Button variant="outline" onClick={() => handlePrint('label')}>
                 <Tag size={16} className="mr-2"/> Print Label
              </Button>
              
              {detailOrder.status === 'Pending' && (
                 <Button onClick={() => handleUpdateStatus('Processing')}>
                    Mark Processing
                 </Button>
              )}
              {detailOrder.status === 'Processing' && (
                 <Button onClick={() => handleUpdateStatus('Shipped')}>
                    Mark Shipped
                 </Button>
              )}
              
              <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full border border-gray-200 dark:border-gray-700">
                        <MoreHorizontal size={16}/>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded text-red-600" onClick={() => handleUpdateStatus('Cancelled')}>
                          Cancel Order
                      </button>
                  </PopoverContent>
              </Popover>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Main Content */}
           <div className="lg:col-span-2 space-y-6">
              {/* Items */}
              <Card>
                 <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
                          <tr>
                             <th className="px-6 py-3">Product</th>
                             <th className="px-6 py-3 text-right">Price</th>
                             <th className="px-6 py-3 text-right">Qty</th>
                             <th className="px-6 py-3 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {detailOrder.line_items?.map((item: any, i: number) => (
                             <tr key={i}>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <img src={item.image} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt={item.product}/>
                                      <div>
                                         <p className="font-medium text-gray-900 dark:text-white">{item.product}</p>
                                         <p className="text-xs text-gray-500">{item.variant} • {item.sku}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">${Number(item.price).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">{item.quantity}</td>
                                <td className="px-6 py-4 text-right font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 {/* Totals */}
                 <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex flex-col gap-2 max-w-xs ml-auto">
                       <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Subtotal</span>
                          <span>${(Number(detailOrder.total) - 5.99).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Shipping</span>
                          <span>$5.99</span>
                       </div>
                       <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                          <span>Total</span>
                          <span>${Number(detailOrder.total).toFixed(2)}</span>
                       </div>
                    </div>
                 </div>
              </Card>

              {/* Timeline */}
              <Card>
                 <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                 <CardContent>
                    <div className="space-y-6 relative pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                       {detailOrder.timeline?.map((event: any, i: number) => (
                          <div key={i} className="relative">
                             <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-brand-primary ring-4 ring-white dark:ring-[#262626]"></div>
                             <p className="text-sm font-medium text-gray-900 dark:text-white">{event.status}</p>
                             <p className="text-xs text-gray-500">{new Date(event.date).toLocaleString()} {event.description && `- ${event.description}`}</p>
                          </div>
                       ))}
                       {detailOrder.timeline.length === 0 && <p className="text-sm text-gray-500">No events yet.</p>}
                    </div>
                 </CardContent>
              </Card>
              
              {/* Notes */}
              <Card>
                  <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
                  <CardContent>
                      <div className="space-y-4">
                          {detailOrder.notes?.map((note: any, i: number) => (
                              <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                  <p>{note.note}</p>
                                  <div className="flex justify-between mt-1">
                                    <p className="text-xs opacity-70">{new Date(note.created_at).toLocaleString()}</p>
                                    <span className="text-xs font-bold opacity-60">Admin</span>
                                  </div>
                              </div>
                          ))}
                          <div className="flex gap-2">
                              <input 
                                  className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                                  placeholder="Add a private note..."
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                              />
                              <Button onClick={handleAddNote}>Add Note</Button>
                          </div>
                      </div>
                  </CardContent>
              </Card>
           </div>

           {/* Sidebar */}
           <div className="space-y-6">
              {/* Customer */}
              <Card>
                 <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                 <CardContent>
                    <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -mx-2 rounded-lg transition-colors" onClick={() => onNavigate('customers', undefined, 'detail')}>
                       <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand-primary font-bold">
                          {detailOrder.customer.charAt(0)}
                       </div>
                       <div>
                          <p className="font-medium text-gray-900 dark:text-white">{detailOrder.customer}</p>
                          <p className="text-xs text-gray-500">View Profile</p>
                       </div>
                       <ChevronRight size={16} className="ml-auto text-gray-400"/>
                    </div>
                    <div className="space-y-3 text-sm">
                       <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Mail size={16} className="text-gray-400"/>
                          <a href={`mailto:${detailOrder.email}`} className="hover:text-brand-primary">{detailOrder.email}</a>
                       </div>
                       <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Phone size={16} className="text-gray-400"/>
                          <span>{detailOrder.shipping_address?.phone || 'N/A'}</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                 <CardHeader className="flex flex-row justify-between items-center pb-2">
                    <CardTitle>Shipping Address</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                       {detailOrder.shipping_address ? (
                           <>
                            <p className="font-medium text-gray-900 dark:text-white">{detailOrder.shipping_address.first_name} {detailOrder.shipping_address.last_name}</p>
                            <p>{detailOrder.shipping_address.address1}</p>
                            {detailOrder.shipping_address.address2 && <p>{detailOrder.shipping_address.address2}</p>}
                            <p>{detailOrder.shipping_address.city}, {detailOrder.shipping_address.province} {detailOrder.shipping_address.zip}</p>
                            <p>{detailOrder.shipping_address.country}</p>
                           </>
                       ) : <p className="text-gray-400 italic">No shipping address provided.</p>}
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>

        {/* Reusing Print Modal */}
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex justify-between items-center">
                        <span>Print {printType === 'invoice' ? 'Invoice' : 'Label'}</span>
                        <div className="flex gap-2">
                            <Button onClick={executeBrowserPrint}>
                                <Printer size={16} className="mr-2"/> Print / Download PDF
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto bg-gray-100 p-8">
                    {detailOrder && <OrderPrintView order={detailOrder} type={printType!} />}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
};
