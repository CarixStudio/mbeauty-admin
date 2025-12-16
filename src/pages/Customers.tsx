
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Phone, ArrowLeft, Filter, Calendar, MoreVertical, Edit2, Ban, Eye, Save, ShoppingBag, Loader2, CheckCircle, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DatePicker } from '../components/ui/date-picker';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useCustomer } from '../lib/hooks';
import { CustomerSchema } from '../lib/schemas';

// Custom Hover Card Component for Customer Preview
const CustomerHoverCard = ({ customer, children }: { customer: any, children?: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [timeoutId, setTimeoutId] = useState<any>(null);

    const handleMouseEnter = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        const id = setTimeout(() => setIsOpen(false), 300);
        setTimeoutId(id);
    };

    return (
        <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-72 bg-white dark:bg-[#262626] rounded-xl shadow-2xl border border-brand-accent/20 z-50 animate-in fade-in zoom-in-95 origin-bottom-left p-0 overflow-hidden">
                    <div className="h-16 bg-gradient-to-r from-brand-primary to-[#5a5752]"></div>
                    <div className="px-4 pb-4 -mt-8">
                        <div className="w-16 h-16 rounded-full bg-white dark:bg-[#262626] p-1 shadow-sm">
                            <div className="w-full h-full rounded-full bg-brand-light dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-brand-primary dark:text-white">
                                {(customer.full_name || 'G').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="mt-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">{customer.full_name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-gray-400">Spent</p>
                                <p className="font-bold text-brand-primary dark:text-brand-accent">${Number(customer.calculated_spent || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-gray-400">Role</p>
                                <p className="font-medium text-gray-900 dark:text-white">{customer.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface CustomersPageProps {
    navState: { mode?: string; id?: string | number };
    onNavigate: (page: string, id?: string | number, mode?: 'list' | 'detail') => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ navState, onNavigate }) => {
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    // List State
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [startDate, setStartDate] = useState<Date>();
    const [page, setPage] = useState(1);
    const limit = 10;

    // Detail/Edit State
    const customerId = navState.mode === 'detail' ? navState.id?.toString() : null;
    const { data: detailCustomerData, error: detailError, mutate: mutateCustomer } = useCustomer(customerId || '');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', phone_number: '', role: 'customer' });

    // Transform Data for UI
    const detailCustomer = detailCustomerData ? {
        ...detailCustomerData,
        addresses: detailCustomerData.customer_addresses || []
    } : null;

    const customerOrders = detailCustomerData?.orders || [];

    // Update Edit Form when data loads
    useEffect(() => {
        if (detailCustomer) {
            setEditForm({
                full_name: detailCustomer.full_name,
                email: detailCustomer.email,
                phone_number: detailCustomer.phone_number || '',
                role: detailCustomer.role
            });
        }
    }, [detailCustomer]);

    // ----------------------------------------------------------------------
    // DATA FETCHING (List)
    // ----------------------------------------------------------------------
    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            // Select orders along with customers to calculate totals dynamically
            let query = supabase.from('customers').select('*, orders(id, total_amount, payment_status)', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }
            if (roleFilter !== 'All') {
                query = query.eq('role', roleFilter.toLowerCase());
            }
            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Process data to calculate LTV (Paid orders only)
            const processedData = (data || []).map((cust: any) => {
                const totalSpent = cust.orders
                    ? cust.orders
                        .filter((o: any) => o.payment_status?.toLowerCase() === 'paid')
                        .reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0)
                    : 0;

                return {
                    ...cust,
                    calculated_spent: totalSpent
                };
            });

            setCustomers(processedData);
            setTotalCount(count || 0);
        } catch (error: any) {
            addToast('Error fetching customers: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, roleFilter, startDate, page, addToast]);

    useEffect(() => {
        if (!navState.mode || navState.mode === 'list') {
            fetchCustomers();
        }
    }, [navState.mode, fetchCustomers]);

    // ----------------------------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------------------------
    const handleStatusToggle = async (customer: any) => {
        const newStatus = customer.status === 'Active' ? 'Disabled' : 'Active';
        const action = newStatus === 'Active' ? 'Enable' : 'Disable';

        if (await confirm({
            title: `${action} Account`,
            description: `Are you sure you want to ${action.toLowerCase()} ${customer.full_name}?`,
            variant: newStatus === 'Disabled' ? 'danger' : 'default'
        })) {
            try {
                await supabase.from('customers').update({ status: newStatus }).eq('id', customer.id);
                addToast(`Customer ${newStatus.toLowerCase()}`, 'success');
                fetchCustomers();
            } catch (error: any) {
                addToast(error.message, 'error');
            }
        }
    };

    const handleUpdateCustomer = async () => {
        if (!detailCustomer) return;

        // Zod Validation
        const validation = CustomerSchema.safeParse(editForm);
        if (!validation.success) {
            addToast(validation.error.issues[0].message, 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('customers')
                .update(editForm)
                .eq('id', detailCustomer.id);

            if (error) throw error;

            mutateCustomer(); // Refresh SWR
            setIsEditOpen(false);
            addToast('Customer updated successfully', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    };

    const getInitials = (name: string) => (name || 'G').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // ----------------------------------------------------------------------
    // VIEW: DETAIL
    // ----------------------------------------------------------------------
    if (navState.mode === 'detail' && customerId) {
        if (!detailCustomer && !detailError) {
            return (
                <div className="p-8 space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-1 space-y-4">
                            <Skeleton className="h-64 w-full" />
                        </div>
                        <div className="col-span-2 space-y-4">
                            <Skeleton className="h-full w-full" />
                        </div>
                    </div>
                </div>
            );
        }

        if (detailError) return <div className="p-8 text-center text-red-500">Error loading customer</div>;

        if (detailCustomer) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => onNavigate('customers', undefined, 'list')}>
                                <ArrowLeft size={20} className="mr-2" /> Back
                            </Button>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{detailCustomer.full_name}</h1>
                            <Badge variant={detailCustomer.role === 'vip' ? 'warning' : 'default'}>{detailCustomer.role}</Badge>
                            {detailCustomer.status === 'Disabled' && <Badge variant="error">Disabled</Badge>}
                        </div>
                        <Button onClick={() => setIsEditOpen(true)}><Edit2 size={16} className="mr-2" /> Edit Profile</Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Card */}
                        <div className="space-y-6">
                            <Card className="text-center p-6 border-t-4 border-t-brand-primary">
                                <div className="w-24 h-24 mx-auto rounded-full bg-brand-light dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-brand-primary dark:text-white border-4 border-white dark:border-[#262626] shadow-lg mb-4">
                                    {getInitials(detailCustomer.full_name)}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detailCustomer.full_name}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{detailCustomer.email}</p>

                                <div className="mt-6 grid grid-cols-2 gap-4 text-left">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Total Spent</p>
                                        <p className="text-lg font-bold text-brand-primary dark:text-white">${Number(detailCustomer.calculated_spent || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Orders</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{customerOrders.length}</p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Mail size={16} className="text-gray-400" /> {detailCustomer.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Phone size={16} className="text-gray-400" /> {detailCustomer.phone_number || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Calendar size={16} className="text-gray-400" /> Joined {new Date(detailCustomer.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Address Book</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {detailCustomer.addresses?.map((addr: any) => (
                                        <div key={addr.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-gray-900 dark:text-white">{addr.first_name} {addr.last_name}</span>
                                                {addr.is_default && <Badge variant="secondary" className="scale-75">Default</Badge>}
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                                {addr.address1} {addr.address2}<br />
                                                {addr.city}, {addr.province} {addr.zip}<br />
                                                {addr.country}
                                            </p>
                                        </div>
                                    ))}
                                    {detailCustomer.addresses?.length === 0 && <p className="text-sm text-gray-500 italic">No addresses saved.</p>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Orders Table */}
                        <div className="lg:col-span-2">
                            <Card className="h-full">
                                <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 border-b dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-3">Order #</th>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Total</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {customerOrders.length > 0 ? (
                                                customerOrders.map((order: any) => (
                                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => onNavigate('orders', order.id, 'detail')}>
                                                        <td className="px-6 py-4 font-medium text-brand-primary dark:text-white">
                                                            {order.order_number || `#${order.id.substring(0, 8)}`}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">${Number(order.total_amount).toFixed(2)}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'default'}>
                                                                {order.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button size="sm" variant="ghost"><Eye size={14} /></Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No orders found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Edit Modal */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent className="sm:max-w-md bg-white dark:bg-[#262626] border-gray-200 dark:border-gray-700">
                            <DialogHeader>
                                <DialogTitle className="text-gray-900 dark:text-white">Edit Customer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                    <input
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                        value={editForm.full_name}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                    <input
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                                    <input
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                        value={editForm.phone_number}
                                        onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                    <select
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                        value={editForm.role}
                                        onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="vip">VIP</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdateCustomer}>Save Changes</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            );
        }
    }

    // List view
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Customers</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your customer base and view profiles.</p>
                </div>
            </div>

            <Card className="p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent outline-none"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 border rounded-lg px-3 bg-white dark:bg-[#333]">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                className="bg-transparent text-sm outline-none p-2"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="All">All Roles</option>
                                <option value="Customer">Customer</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                        <DatePicker date={startDate} setDate={setStartDate} placeholder="Joined After" className="w-[180px]" />
                    </div>
                </div>
            </Card>

            <Card className="hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Contact</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Spent (Paid)</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>)
                            ) : customers.length > 0 ? (
                                customers.map(customer => (
                                    <tr key={customer.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${customer.status === 'Disabled' ? 'opacity-60 bg-gray-50 dark:bg-gray-900' : ''}`}>
                                        <td className="px-6 py-4">
                                            <CustomerHoverCard customer={customer}>
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('customers', customer.id, 'detail')}>
                                                    <div className="w-9 h-9 rounded-full bg-brand-light dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-brand-primary dark:text-white border border-gray-200 dark:border-gray-600">
                                                        {getInitials(customer.full_name)}
                                                    </div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{customer.full_name || 'Guest'}</div>
                                                </div>
                                            </CustomerHoverCard>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            <div>{customer.email}</div>
                                            {customer.phone_number && <div>{customer.phone_number}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={customer.role === 'vip' ? 'warning' : 'default'}>{customer.role}</Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">${Number(customer.calculated_spent || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={customer.status === 'Active' ? 'success' : 'error'}>{customer.status || 'Active'}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm"><MoreVertical size={16} /></Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-40 p-1" align="end">
                                                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2" onClick={() => onNavigate('customers', customer.id, 'detail')}>
                                                        <Eye size={14} /> View Details
                                                    </button>
                                                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-red-600" onClick={() => handleStatusToggle(customer)}>
                                                        <Ban size={14} /> {customer.status === 'Active' ? 'Disable' : 'Enable'}
                                                    </button>
                                                </PopoverContent>
                                            </Popover>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No customers found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
