
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  ShoppingBag,
  Users,
  CreditCard,
  MoreVertical,
  AlertCircle,
  Activity,
  Download,
  ChevronLeft,
  ChevronRight,
  Globe,
  TrendingUp,
  RefreshCw,
  Package,
  Filter,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatsCard } from '../components/dashboard/StatsCard';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { ImportExportModal } from '../components/ui/ImportExportModal';
import { SimpleTooltip } from '../components/ui/Tooltip';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { CloudinaryOptimizer } from '../lib/cloudinary';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';

interface DashboardProps {
  onNavigate?: (page: string, id?: string | number, mode?: 'list' | 'create' | 'edit' | 'detail' | 'live') => void;
  currency?: { code: string; symbol: string; rate: number };
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate: propOnNavigate, currency = { code: 'USD', symbol: '$', rate: 1 } }) => {
  const onNavigate = propOnNavigate || ((_page: string, _id?: string | number, _mode?: 'list' | 'create' | 'edit' | 'detail' | 'live') => { });

  // Real Data State
  const [loading, setLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Toggles & Filters
  const [revenueType, setRevenueType] = useState<'net' | 'gross'>('net'); // Default to Net for Dashboard
  const [ordersTimeFilter, setOrdersTimeFilter] = useState<'24h' | '7d' | '14d'>('7d');

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    conversionRate: 3.2,
    pendingOrders: 0,
    cancelledOrders: 0,
    revenueTrend: [0, 0, 0, 0, 0, 0, 0]
  });

  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [liveVisitors, setLiveVisitors] = useState(0);

  // Pagination for Recent Orders
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 5;

  // Initial Fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Re-calculate derived data when toggles change (without re-fetching if possible, but here we re-process)
  useEffect(() => {
    if (!loading) {
      fetchDashboardData();
    }
  }, [revenueType]);

  const fetchDashboardData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const today = new Date();
      const startOfPeriod = new Date(today);
      startOfPeriod.setDate(today.getDate() - 30); // Fetch last 30 days to support all filters

      // We use Promise.allSettled to ensure one failing query doesn't crash the whole dashboard
      const results = await Promise.allSettled([
        // 0. Orders
        supabase.from('orders')
          .select('id, total_amount, status, payment_status, created_at, customer_id, customers(full_name, email)')
          .gte('created_at', startOfPeriod.toISOString())
          .order('created_at', { ascending: false }),

        // 1. Customers Count
        supabase.from('customers').select('id, full_name, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(5),

        // 2. Low Stock Variants
        supabase.from('product_variants')
          .select(`
                    id, 
                    sku, 
                    inventory_count, 
                    products (
                        id, 
                        name, 
                        image_url
                    )
                `)
          .lt('inventory_count', 10)
          .gt('inventory_count', 0)
          .order('inventory_count', { ascending: true })
          .limit(10),

        // 3. Notifications Feed
        supabase.from('admin_notifications')
          .select('type, message, created_at')
          .order('created_at', { ascending: false })
          .limit(8),

        // 4. Active Sessions (Live Visitors)
        supabase.from('user_sessions')
          .select('id', { count: 'exact', head: true })
          .gt('last_activity', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Active in last 15m
      ]);

      // Helper to extract data
      const getData = (index: number) =>
        results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value.data : [];

      const rawOrders = getData(0) || [];
      const customersRes = results[1].status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<any>).value : { data: [], count: 0 };
      const customerCount = customersRes.count || 0;
      const variants = getData(2) || [];
      const notifFeed = getData(3) || [];
      const sessionRes = results[4].status === 'fulfilled' ? (results[4] as PromiseFulfilledResult<any>).value : { count: 0 };

      setLiveVisitors(sessionRes.count || 0);

      // --- ALGORITHM: Revenue Calculation ---
      // Gross = All non-cancelled orders
      // Net = All non-cancelled AND paid orders
      const validRevenueOrders = rawOrders.filter((o: any) => {
        const isCancelled = o.status?.toLowerCase() === 'cancelled';
        const isPaid = o.payment_status?.toLowerCase() === 'paid';

        if (isCancelled) return false;
        if (revenueType === 'net') return isPaid;
        return true; // Gross includes pending/unpaid as 'Volume'
      });

      const totalRevenue = validRevenueOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

      // --- ALGORITHM: Order Count ---
      // Count everything for "Total Orders" stat but show breakdown
      const totalOrders = rawOrders.length;
      const pendingOrders = rawOrders.filter((o: any) => o.status?.toLowerCase() === 'pending').length;
      const cancelledOrders = rawOrders.filter((o: any) => o.status?.toLowerCase() === 'cancelled').length;

      // --- ALGORITHM: Revenue Trend & Chart Data (Last 7 Days - Specific Dates) ---
      // We use actual dates as keys to prevent Mon/Tue overlap if data spans weeks
      const trendData = new Array(7).fill(0);
      const chartMap: Record<string, number> = {};

      // Initialize last 7 days keys
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g., "Oct 24"
        chartMap[dateKey] = 0;
      }

      validRevenueOrders.forEach((order: any) => {
        const orderDate = new Date(order.created_at);
        const dateKey = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Populate Chart Data if key exists (within last 7 days range)
        if (chartMap[dateKey] !== undefined) {
          chartMap[dateKey] += Number(order.total_amount);
        }

        // Populate Trend Sparkline (Array Index based)
        // Calculate days difference from today
        const diffTime = Math.abs(today.setHours(0, 0, 0, 0) - orderDate.setHours(0, 0, 0, 0));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
          // Index 6 is today, 0 is 6 days ago
          const index = 6 - diffDays;
          if (index >= 0 && index < 7) {
            trendData[index] += Number(order.total_amount);
          }
        }
      });

      const chartData = Object.keys(chartMap).map(name => ({ name, value: chartMap[name] }));
      setRevenueChartData(chartData);

      setStats({
        totalRevenue,
        totalOrders,
        totalCustomers: customerCount,
        conversionRate: 3.2,
        pendingOrders,
        cancelledOrders,
        revenueTrend: trendData
      });

      // --- ALGORITHM: Order Status Distribution ---
      const statusCounts: Record<string, number> = {};
      rawOrders.forEach((order: any) => {
        // Normalize status
        const status = (order.status || 'unknown').charAt(0).toUpperCase() + (order.status || 'unknown').slice(1).toLowerCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const statusColors: Record<string, string> = {
        'Pending': '#f59e0b', 'Processing': '#3b82f6', 'Shipped': '#8b5cf6', 'Delivered': '#10b981', 'Cancelled': '#ef4444'
      };
      const pieData = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status],
        color: statusColors[status] || '#9ca3af'
      }));
      setOrderStatusData(pieData);

      // --- ALGORITHM: Recent Orders List ---
      // This is stored in state, filtering happens in render or effect based on `ordersTimeFilter`
      const mappedOrders = rawOrders.map((o: any) => ({
        id: o.id,
        displayId: `#${o.id.substring(0, 8).toUpperCase()}`,
        customer: o.customers?.full_name || 'Guest',
        email: o.customers?.email || 'No email',
        total: o.total_amount,
        status: (o.status || 'pending').charAt(0).toUpperCase() + (o.status || 'pending').slice(1).toLowerCase(),
        date: o.created_at,
        payment: (o.payment_status || 'pending').charAt(0).toUpperCase() + (o.payment_status || 'pending').slice(1).toLowerCase()
      }));
      setRecentOrders(mappedOrders);

      // --- ALGORITHM: Low Stock ---
      const mappedLowStock = variants.map((v: any) => ({
        id: v.products?.id,
        variant_id: v.id,
        name: v.products?.name || 'Unknown Product',
        sku: v.sku,
        stock: v.inventory_count,
        image: CloudinaryOptimizer.url(v.products?.image_url, { width: 100, crop: 'fill' })
      }));
      setLowStockProducts(mappedLowStock);

      // --- ALGORITHM: Activity Feed (Direct from Admin Notifications) ---
      const feed = notifFeed.map((n: any, idx: number) => ({
        id: idx,
        type: n.type,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(n.created_at).getTime()
      }));
      setActivityFeed(feed);

    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Recent Orders Filtering
  const getFilteredRecentOrders = () => {
    const now = new Date();
    let limitDate = new Date();

    if (ordersTimeFilter === '24h') limitDate.setDate(now.getDate() - 1);
    else if (ordersTimeFilter === '7d') limitDate.setDate(now.getDate() - 7);
    else if (ordersTimeFilter === '14d') limitDate.setDate(now.getDate() - 14);

    return recentOrders.filter(o => new Date(o.date) >= limitDate);
  };

  const formatCurrency = (val: number) => {
    return `${currency.symbol}${(val * currency.rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Pagination for the *filtered* list
  const filteredOrderList = getFilteredRecentOrders();
  const totalOrderPages = Math.ceil(filteredOrderList.length / itemsPerPage);
  const paginatedOrders = filteredOrderList.slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of your store's performance.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          {/* Global Revenue Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2">
            <button
              onClick={() => setRevenueType('net')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${revenueType === 'net' ? 'bg-white dark:bg-gray-600 text-brand-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              Net Sales
            </button>
            <button
              onClick={() => setRevenueType('gross')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${revenueType === 'gross' ? 'bg-white dark:bg-gray-600 text-brand-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              Gross Sales
            </button>
          </div>

          <SimpleTooltip content="Refresh Data">
            <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Download PDF/CSV Report">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsExportOpen(true)}>
              <Download size={16} className="mr-2" /> Report
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Create a new product listing">
            <Button onClick={() => onNavigate('products', undefined, 'create')} className="flex-1 sm:flex-none">Add Product</Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetErrorBoundary title="Stats">
          {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />) : (
            <>
              <StatsCard
                title={revenueType === 'net' ? "Net Revenue (Paid)" : "Gross Revenue (Vol)"}
                value={<><span className="text-lg">{currency.symbol}</span><AnimatedCounter value={stats.totalRevenue * currency.rate} /></>}
                icon={revenueType === 'net' ? DollarSign : CreditCard}
                trendData={stats.revenueTrend}
                change={12.5}
                chartColor="#d4a574"
              />
              <StatsCard
                title="Total Orders"
                value={<AnimatedCounter value={stats.totalOrders} />}
                icon={ShoppingBag}
                trendData={stats.revenueTrend.map(v => v / 100)}
                change={5.2}
                pendingCount={stats.pendingOrders}
                cancelledCount={stats.cancelledOrders}
                chartColor="#3b82f6"
              />
              <StatsCard
                title="Total Customers"
                value={<AnimatedCounter value={stats.totalCustomers} />}
                icon={Users}
                trendData={[2, 4, 3, 5, 8, 6, 9]}
                change={8}
                changeLabel="new this week"
                chartColor="#8b5cf6"
              />
              <StatsCard
                title="Conversion Rate"
                value={<><AnimatedCounter value={stats.conversionRate} format={v => v.toFixed(1)} />%</>}
                icon={TrendingUp}
                trendData={[3.0, 3.1, 3.0, 3.2, 3.3, 3.1, 3.2]}
                change={-0.4}
                chartColor="#ef4444"
              />
            </>
          )}
        </WidgetErrorBoundary>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{revenueType === 'net' ? 'Net Revenue' : 'Gross Volume'} Over Time</CardTitle>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 text-xs w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-3 py-1 bg-white dark:bg-gray-700 rounded shadow-sm text-gray-800 dark:text-white font-medium">Last 7 Days</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <WidgetErrorBoundary title="Chart Error">
                {loading ? <Skeleton className="w-full h-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4a574" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#d4a574" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" strokeOpacity={0.2} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        tickFormatter={(value) => `${currency.symbol}${value}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#67645e', fontWeight: 600 }}
                        formatter={(value) => [`${currency.symbol}${value ?? 0}`, revenueType === 'net' ? 'Net Revenue' : 'Gross Volume']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#d4a574"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </WidgetErrorBoundary>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
              <WidgetErrorBoundary title="Status Chart">
                {loading ? <Skeleton className="w-full h-full rounded-full" /> : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {orderStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#9ca3af' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        <AnimatedCounter value={stats.totalOrders} />
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total Orders</span>
                    </div>
                  </>
                )}
              </WidgetErrorBoundary>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <div className="flex gap-2">
              {['24h', '7d', '14d'].map((range) => (
                <button
                  key={range}
                  onClick={() => { setOrdersTimeFilter(range as any); setOrdersPage(1); }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${ordersTimeFilter === range ? 'bg-brand-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : (
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => onNavigate('orders', order.id, 'detail')}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.displayId}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">{order.customer}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{order.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            order.status === 'Delivered' ? 'success' :
                              order.status === 'Pending' ? 'warning' :
                                order.status === 'Cancelled' ? 'error' :
                                  'default'
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-brand-primary dark:hover:text-white" onClick={(e) => { e.stopPropagation(); onNavigate('orders', order.id, 'detail'); }}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No recent orders in this period.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination Controls */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Page {ordersPage} of {Math.max(1, totalOrderPages)}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={ordersPage === 1}
                onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={ordersPage >= totalOrderPages}
                onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column Stack */}
        <div className="space-y-6">

          {/* Live Store View Widget */}
          <div className="bg-brand-primary dark:bg-gray-800 text-white rounded-xl p-6 relative overflow-hidden cursor-pointer group shadow-lg transition-transform hover:scale-[1.02]" onClick={() => onNavigate('analytics', undefined, 'live')}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">Live View</span>
              </div>
              <h3 className="text-2xl font-bold">{liveVisitors} Visitors</h3>
              <p className="text-white/80 text-sm mt-1">Currently active sessions</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-brand-accent group-hover:underline">
                View Live Map <Globe size={14} />
              </div>
            </div>
            {/* Abstract decorative elements */}
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe size={120} />
            </div>
          </div>

          {/* Recent Activity Feed (Dynamic) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-brand-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetErrorBoundary>
                {loading ? <Skeleton className="h-48 w-full" /> : (
                  <div className="relative pl-4 border-l border-gray-200 dark:border-gray-700 space-y-6">
                    {activityFeed.map((item, index) => (
                      <div key={`${item.type}-${item.id}-${index}`} className="relative">
                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-[#262626] ${item.type === 'order' ? 'bg-blue-500' :
                            item.type === 'stock' ? 'bg-red-500' :
                              item.type === 'review' ? 'bg-amber-500' :
                                item.type === 'customer' ? 'bg-purple-500' : 'bg-green-500'
                          }`}></div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.message}>{item.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.time}</p>
                      </div>
                    ))}
                    {activityFeed.length === 0 && <p className="text-sm text-gray-500">No recent activity found.</p>}
                  </div>
                )}
              </WidgetErrorBoundary>
            </CardContent>
          </Card>

          {/* Low Stock Alerts (Dynamic) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <WidgetErrorBoundary>
                {loading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : (
                  <>
                    {lowStockProducts.map((item) => (
                      <div key={item.variant_id} className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-red-600 dark:text-red-400 font-bold text-sm">{item.stock} left</span>
                          <button className="block text-xs text-brand-primary dark:text-white hover:underline mt-0.5" onClick={() => onNavigate('products', item.id, 'edit')}>Restock</button>
                        </div>
                      </div>
                    ))}
                    {lowStockProducts.length === 0 && <div className="p-4 text-center text-sm text-gray-500">All stock levels normal.</div>}
                  </>
                )}
              </WidgetErrorBoundary>
            </div>
          </Card>

        </div>
      </div>

      <ImportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        type="export"
        entityName="Dashboard Report"
      />
    </div>
  );
};
