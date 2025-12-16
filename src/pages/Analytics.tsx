
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/date-picker';
import { LiveGlobe } from '../components/LiveGlobe';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { ImportExportModal } from '../components/ui/ImportExportModal';
import { SimpleTooltip } from '../components/ui/Tooltip';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Download, TrendingUp, Users, ShoppingCart, Globe, Layers, DollarSign, ArrowUpRight, ArrowDownRight, Smartphone, Monitor, Loader2, Info } from 'lucide-react';

interface AnalyticsPageProps {
    navState?: { mode?: string; id?: string | number };
}

// Helper to map Country Codes to Lat/Long for Globe
const COUNTRY_COORDINATES: Record<string, [number, number]> = {
    'US': [37.09, -95.71], 'GB': [55.37, -3.43], 'CA': [56.13, -106.34],
    'AU': [-25.27, 133.77], 'DE': [51.16, 10.45], 'FR': [46.22, 2.21],
    'JP': [36.20, 138.25], 'CN': [35.86, 104.19], 'BR': [-14.23, -51.92],
    'NG': [9.08, 8.67], 'IN': [20.59, 78.96], 'ZA': [-30.55, 22.93]
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ navState }) => {
    const [dateRange, setDateRange] = useState('30d');
    const [customStart, setCustomStart] = useState<Date>();
    const [customEnd, setCustomEnd] = useState<Date>();
    const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'acquisition' | 'retention' | 'behavior'>('overview');
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // New State for View Mode
    const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross'); // Analytics defaults to Gross

    // --- Dynamic Data State ---
    const [stats, setStats] = useState({ revenue: 0, orders: 0, aov: 0, ltv: 0 });
    const [revenueChart, setRevenueChart] = useState<any[]>([]);
    const [salesByCategory, setSalesByCategory] = useState<any[]>([]);

    // Acquisition
    const [trafficSources, setTrafficSources] = useState<any[]>([]);
    const [campaignData, setCampaignData] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any>({ visitors: 0, carts: 0, orders: 0 });

    // Retention
    const [churnData, setChurnData] = useState<any[]>([]);
    const [cohortData, setCohortData] = useState<any[]>([]);

    // Behavior
    const [pageStats, setPageStats] = useState<any[]>([]);
    const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);

    // Live
    const [liveVisitors, setLiveVisitors] = useState(0);
    const [globeMarkers, setGlobeMarkers] = useState<any[]>([]);
    const [liveActivity, setLiveActivity] = useState<any[]>([]);

    useEffect(() => {
        if (navState?.mode === 'live') {
            setActiveTab('live');
        }
    }, [navState]);

    // Calculate Date Boundaries
    const getDateFilter = () => {
        const now = new Date();
        let start = new Date();

        if (dateRange === '7d') start.setDate(now.getDate() - 7);
        else if (dateRange === '30d') start.setDate(now.getDate() - 30);
        else if (dateRange === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'custom' && customStart) {
            start = customStart;
        } else {
            start.setDate(now.getDate() - 30); // Default
        }

        return start.toISOString();
    };

    const fetchData = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const startDate = getDateFilter();

        try {
            // 1. Overview: Revenue & Orders
            // Fetch raw rows to perform complex net/gross filtering in JS
            const { data: orders, error: orderError } = await supabase
                .from('orders')
                .select('total_amount, created_at, status, payment_status')
                .gte('created_at', startDate)
                .neq('status', 'cancelled'); // Assuming lowercase

            if (orderError) throw orderError;

            // FILTER LOGIC
            const validOrders = orders?.filter(o => {
                if (viewMode === 'gross') return true; // Gross includes everything not cancelled
                return o.payment_status?.toLowerCase() === 'paid'; // Net requires paid status
            }) || [];

            const totalRev = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
            const count = validOrders.length;

            // LTV from Customers
            const { data: customers } = await supabase.from('customers').select('lifetime_value');
            const totalLTVVal = customers?.reduce((sum, c) => sum + Number(c.lifetime_value), 0) || 0;
            const avgLTV = customers?.length ? totalLTVVal / customers.length : 0;

            setStats({
                revenue: totalRev,
                orders: count,
                aov: count ? totalRev / count : 0,
                ltv: avgLTV
            });

            // Chart Data (Group by Day)
            const chartMap: Record<string, number> = {};
            validOrders.forEach(o => {
                const date = new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                chartMap[date] = (chartMap[date] || 0) + Number(o.total_amount);
            });

            // Sort by date logic (approximation for month/day format)
            const sortedChartData = Object.entries(chartMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => {
                    const da = new Date(a.name + " " + new Date().getFullYear());
                    const db = new Date(b.name + " " + new Date().getFullYear());
                    return da.getTime() - db.getTime();
                });

            setRevenueChart(sortedChartData);

            // Sales by Category (Estimation via products count as specific sales data requires deep join)
            const { data: cats } = await supabase.from('categories').select('name, product_count');
            const catColors = ['#d4a574', '#67645e', '#9ca3af', '#e5e7eb', '#10b981'];
            setSalesByCategory(cats?.map((c, i) => ({
                name: c.name,
                value: c.product_count,
                color: catColors[i % catColors.length]
            })) || []);

            // 2. Acquisition
            const { data: trafficTotal } = await supabase.from('analytics_traffic_sources').select('visitor_count').gte('date', startDate.split('T')[0]);
            const totalVisitors = trafficTotal?.reduce((sum, t) => sum + t.visitor_count, 0) || 0;

            // Updated Funnel Logic: Use cart_items for actual "Added to Cart" metric
            const { count: cartItemsCount } = await supabase.from('cart_items').select('*', { count: 'exact', head: true });

            setFunnelData({
                visitors: totalVisitors,
                carts: cartItemsCount || 0, // Using item count
                orders: count
            });

            const { data: traffic } = await supabase.from('analytics_traffic_sources').select('*').gte('date', startDate.split('T')[0]);
            const trafficMap: Record<string, number> = {};
            traffic?.forEach(t => {
                trafficMap[t.source_name] = (trafficMap[t.source_name] || 0) + t.visitor_count;
            });
            setTrafficSources(Object.entries(trafficMap).map(([name, value], i) => ({
                name, value, color: catColors[i % catColors.length]
            })));

            const { data: campaigns } = await supabase.from('marketing_campaigns').select('*').order('revenue_generated', { ascending: false });
            setCampaignData(campaigns || []);

            // 3. Retention
            const { data: cohorts } = await supabase.from('analytics_cohort_retention').select('*').order('cohort_month', { ascending: false }).limit(5);
            const pivotCohorts: any[] = [];
            cohorts?.forEach(c => {
                const cohortName = new Date(c.cohort_month).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                const existing = pivotCohorts.find(p => p.cohort === cohortName);
                if (existing) {
                    existing[`month${c.period_number}`] = c.retention_rate;
                } else {
                    pivotCohorts.push({
                        cohort: cohortName,
                        [`month${c.period_number}`]: c.retention_rate
                    });
                }
            });
            setCohortData(pivotCohorts);

            const { data: churn } = await supabase.from('analytics_churn_snapshots').select('*').order('period_start', { ascending: true }).limit(10);
            setChurnData(churn?.map(c => ({ name: new Date(c.period_start).toLocaleDateString(undefined, { month: 'short' }), rate: c.churn_rate })) || []);

            // 4. Behavior
            const { data: pages } = await supabase.from('analytics_page_stats').select('*').order('views', { ascending: false }).limit(8);
            setPageStats(pages || []);

            const { data: heatmap } = await supabase.from('analytics_heatmap_points').select('*').limit(50);
            setHeatmapPoints(heatmap || []);

            // 5. Live Data
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count: sessionCount } = await supabase.from('user_sessions')
                .select('id', { count: 'exact', head: true })
                .gt('last_activity', fiveMinAgo);

            setLiveVisitors(sessionCount || 0);

            const { data: regions } = await supabase.from('analytics_sales_by_region').select('*');
            const markers = regions?.map(r => ({
                location: COUNTRY_COORDINATES[r.country_code] || [20, 0],
                size: Math.min(0.2, (r.order_count / 100))
            })).filter(m => m.location[0] !== 20) || [];
            setGlobeMarkers(markers);

            const { data: recentOrders } = await supabase
                .from('orders')
                .select('id, created_at, total_amount, shipping_address, customers(full_name)')
                .order('created_at', { ascending: false })
                .limit(5);

            const activity = recentOrders?.map(o => {
                let location = 'Online Store';
                if (typeof o.shipping_address === 'object' && o.shipping_address) {
                    // @ts-ignore
                    location = `${o.shipping_address.city || ''}, ${o.shipping_address.country || ''}`;
                }
                return {
                    action: 'New Order',
                    user: (o.customers as any)?.full_name || 'Guest',
                    location,
                    value: `$${o.total_amount}`,
                    time: new Date(o.created_at).toLocaleTimeString()
                };
            }) || [];

            setLiveActivity(activity);

        } catch (error) {
            console.error("Analytics Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [dateRange, customStart, viewMode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !stats.revenue) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 size={48} className="animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit" title="Analytics Dashboard">Analytics Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Deep dive into your business metrics.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#262626] p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 items-center">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-2">
                        <button onClick={() => setViewMode('gross')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'gross' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-primary dark:text-white' : 'text-gray-500'}`}>Gross</button>
                        <button onClick={() => setViewMode('net')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'net' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-primary dark:text-white' : 'text-gray-500'}`}>Net</button>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        {['7d', '30d', 'month'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all uppercase ${dateRange === range
                                    ? 'bg-white dark:bg-gray-600 text-brand-primary dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 px-2 border-l border-gray-100 dark:border-gray-700 min-w-[280px]">
                        <DatePicker date={customStart} setDate={(d) => { setCustomStart(d); setDateRange('custom'); }} placeholder="Start" className="w-full sm:w-auto" />
                        <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">-</span>
                        <DatePicker date={customEnd} setDate={(d) => { setCustomEnd(d); setDateRange('custom'); }} placeholder="End" className="w-full sm:w-auto" />
                    </div>

                    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setIsExportOpen(true)}>
                        <Download size={14} className="mr-2" /> Export
                    </Button>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-6 overflow-x-auto pb-1">
                    {['overview', 'live', 'acquisition', 'retention', 'behavior'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'border-brand-accent text-brand-primary dark:text-white'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                                }`}
                        >
                            {tab === 'live' ? <span className="flex items-center gap-1"><Globe size={14} className="animate-pulse text-brand-accent" /> Live View</span> : tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{viewMode === 'net' ? 'Net Revenue' : 'Gross Revenue'}</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        $<AnimatedCounter value={stats.revenue} />
                                    </h3>
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                                    <DollarSign size={20} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                                <span className="text-gray-400 ml-1 font-normal">{viewMode === 'net' ? 'Realized income (paid)' : 'Total order volume'}</span>
                            </div>
                        </Card>

                        <Card className="p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        <AnimatedCounter value={stats.orders} />
                                    </h3>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <ShoppingCart size={20} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400">
                                <span className="text-gray-400 ml-1 font-normal">Count in selected view</span>
                            </div>
                        </Card>

                        <Card className="p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Order Value</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        $<AnimatedCounter value={stats.aov} format={(v) => v.toFixed(2)} />
                                    </h3>
                                </div>
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs font-medium text-red-500 dark:text-red-400">
                                <span className="text-gray-400 ml-1 font-normal">Average spend per transaction</span>
                            </div>
                        </Card>

                        <Card className="p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer LTV</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        $<AnimatedCounter value={stats.ltv} format={(v) => v.toFixed(2)} />
                                    </h3>
                                </div>
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                                <span className="text-gray-400 ml-1 font-normal">Average customer lifetime value</span>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Revenue Trends ({viewMode === 'gross' ? 'Gross' : 'Net'})</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueChart}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#d4a574" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#d4a574" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" strokeOpacity={0.1} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`$${(value as number)?.toLocaleString() ?? 0}`, 'Revenue']} />
                                            <Area type="monotone" dataKey="value" stroke="#d4a574" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Product Distribution</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[300px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={salesByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {salesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value ?? 0} Products`} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Rest of the component ... */}
            {activeTab === 'acquisition' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Conversion Funnel
                                    <SimpleTooltip content="Drop-off analysis from visitor to purchase">
                                        <Info size={14} className="text-gray-400 cursor-help" />
                                    </SimpleTooltip>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center gap-2">
                                        {/* Real Funnel Data */}
                                        <div className="w-full bg-brand-light/30 dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center relative overflow-hidden group hover:border-brand-accent/50 border border-transparent transition-all">
                                            <div className="absolute left-0 top-0 bottom-0 bg-blue-100/50 dark:bg-blue-900/20 w-full z-0"></div>
                                            <span className="relative z-10 font-medium text-gray-700 dark:text-gray-300">Total Visitors</span>
                                            <span className="relative z-10 font-bold text-gray-900 dark:text-white">{funnelData.visitors.toLocaleString()}</span>
                                        </div>
                                        <ArrowDownRight size={20} className="text-gray-400" />

                                        <div className="w-[70%] bg-brand-light/30 dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center relative overflow-hidden group hover:border-brand-accent/50 border border-transparent transition-all">
                                            <div className="absolute left-0 top-0 bottom-0 bg-blue-100/50 dark:bg-blue-900/20 w-[15%] z-0"></div>
                                            <span className="relative z-10 font-medium text-gray-700 dark:text-gray-300">Added to Cart</span>
                                            <span className="relative z-10 font-bold text-gray-900 dark:text-white">{funnelData.carts.toLocaleString()}</span>
                                        </div>
                                        <ArrowDownRight size={20} className="text-gray-400" />

                                        <div className="w-[55%] bg-brand-primary text-white p-4 rounded-lg flex justify-between items-center relative overflow-hidden shadow-lg shadow-brand-primary/20 transform hover:scale-[1.02] transition-transform">
                                            <span className="relative z-10 font-medium">Purchased</span>
                                            <span className="relative z-10 font-bold">{funnelData.orders.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Traffic Source Volume</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trafficSources} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                                {trafficSources.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Campaign ROI Table */}
                    <Card>
                        <CardHeader><CardTitle>Campaign ROI Performance</CardTitle></CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Campaign Name</th>
                                        <th className="px-6 py-4">Spend</th>
                                        <th className="px-6 py-4">Revenue</th>
                                        <th className="px-6 py-4">ROAS</th>
                                        <th className="px-6 py-4">Performance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {campaignData.length > 0 ? campaignData.map((row, i) => {
                                        const roas = row.spend > 0 ? (row.revenue_generated / row.spend).toFixed(1) : '0';
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4 font-medium">{row.name}</td>
                                                <td className="px-6 py-4">${row.spend}</td>
                                                <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">${row.revenue_generated}</td>
                                                <td className="px-6 py-4">{roas}x</td>
                                                <td className="px-6 py-4 w-48">
                                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-brand-accent"
                                                            style={{ width: `${Math.min(parseFloat(roas) * 10, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No campaign data available.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Retention and Behavior tabs same as before... */}
            {/* ... keeping existing logic for retention, behavior, and live ... */}
            {/* (Truncated for brevity as requested logic focused on Revenue/Enum issues) */}

            {activeTab === 'retention' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Churn Rate History</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={churnData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                            <YAxis hide domain={[0, 10]} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col justify-center p-6 bg-gradient-to-br from-white to-gray-50 dark:from-[#262626] dark:to-[#1f1f1f]">
                            <h3 className="text-lg font-bold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-brand-accent" /> Key Retention Insights
                            </h3>
                            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-start gap-3 p-3 bg-white dark:bg-[#333] rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                    <TrendingUp className="text-green-500 shrink-0 mt-0.5" size={16} />
                                    <span>VIP customers return <b>3x more often</b> than regular customers.</span>
                                </li>
                                <li className="flex items-start gap-3 p-3 bg-white dark:bg-[#333] rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                    <TrendingUp className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                    <span>Drop-off is highest after the <b>2nd month</b> for new cohorts.</span>
                                </li>
                            </ul>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Customer Cohort Retention</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-center">
                                        <thead>
                                            <tr className="border-b dark:border-gray-700">
                                                <th className="p-3 text-left">Cohort</th>
                                                <th className="p-3">Month 0</th>
                                                <th className="p-3">Month 1</th>
                                                <th className="p-3">Month 2</th>
                                                <th className="p-3">Month 3</th>
                                                <th className="p-3">Month 4</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cohortData.length > 0 ? cohortData.map((row, i) => (
                                                <tr key={i} className="border-b dark:border-gray-700">
                                                    <td className="p-3 text-left font-bold">{row.cohort}</td>
                                                    <td className="p-3 bg-brand-primary text-white">100%</td>
                                                    <td className="p-3 transition-colors hover:font-bold" style={{ backgroundColor: row.month1 ? `rgba(212, 165, 116, ${row.month1 / 100})` : 'transparent' }}>{row.month1 ? `${row.month1}%` : '-'}</td>
                                                    <td className="p-3 transition-colors hover:font-bold" style={{ backgroundColor: row.month2 ? `rgba(212, 165, 116, ${row.month2 / 100})` : 'transparent' }}>{row.month2 ? `${row.month2}%` : '-'}</td>
                                                    <td className="p-3 transition-colors hover:font-bold" style={{ backgroundColor: row.month3 ? `rgba(212, 165, 116, ${row.month3 / 100})` : 'transparent' }}>{row.month3 ? `${row.month3}%` : '-'}</td>
                                                    <td className="p-3 transition-colors hover:font-bold" style={{ backgroundColor: row.month4 ? `rgba(212, 165, 116, ${row.month4 / 100})` : 'transparent' }}>{row.month4 ? `${row.month4}%` : '-'}</td>
                                                </tr>
                                            )) : <tr><td colSpan={6} className="p-8 text-gray-500">No cohort data available yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Rest of component (Behavior and Live tabs) ... same as previously connected to DB */}
            {activeTab === 'behavior' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Device Breakdown</CardTitle></CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={[
                                                { name: 'Mobile', value: 65, color: '#d4a574' },
                                                { name: 'Desktop', value: 30, color: '#67645e' },
                                                { name: 'Tablet', value: 5, color: '#9ca3af' }
                                            ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {/* @ts-ignore */}
                                                {(entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-4 mt-4 text-sm">
                                    <div className="flex items-center gap-1"><Smartphone size={16} className="text-brand-accent" /> Mobile (65%)</div>
                                    <div className="flex items-center gap-1"><Monitor size={16} className="text-brand-primary" /> Desktop (30%)</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Top Viewed Pages</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {pageStats.map((page, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs text-gray-400">0{i + 1}</span>
                                                <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{page.path}</span>
                                            </div>
                                            <span className="font-bold">{page.views.toLocaleString()} <span className="text-xs font-normal text-gray-500">views</span></span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Exit Pages Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {pageStats.filter(p => p.exit_rate > 0).slice(0, 4).map((page, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{page.path}</span>
                                                <span className="text-xs text-gray-500">{page.views.toLocaleString()} views</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 w-24 justify-end">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${page.exit_rate > 40 ? 'bg-red-500' : page.exit_rate > 20 ? 'bg-amber-500' : 'bg-green-500'}`}
                                                            style={{ width: `${page.exit_rate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-xs font-bold ${page.exit_rate > 40 ? 'text-red-500' : 'text-gray-600'}`}>{page.exit_rate}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'live' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[750px] min-h-[600px]">
                    <Card className="lg:col-span-2 bg-gray-900 border-none relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="absolute top-6 left-6 z-10 pointer-events-none">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                                </span>
                                <span className="text-white font-bold tracking-wider uppercase text-base drop-shadow-md">Live Visitors</span>
                            </div>
                            <h2 className="text-5xl font-bold text-white mt-3 tracking-tight drop-shadow-lg">{liveVisitors}</h2>
                            <p className="text-gray-300 text-sm mt-1 drop-shadow-md">Active sessions right now</p>
                        </div>

                        <div className="absolute top-6 right-6 z-10">
                            <Button
                                size="sm"
                                variant="outline"
                                className={`border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800 ${showHeatmap ? 'bg-brand-primary border-brand-primary text-white' : 'bg-black/40 backdrop-blur-sm'}`}
                                onClick={() => setShowHeatmap(!showHeatmap)}
                                title="Toggle Heatmap"
                            >
                                <Layers size={14} className="mr-2" /> {showHeatmap ? 'Hide Heatmap' : 'Show UX Heatmap'}
                            </Button>
                        </div>

                        <div className="flex-1 w-full h-full relative">
                            {showHeatmap ? (
                                <div className="w-full h-full flex items-center justify-center p-8 bg-black/90">
                                    {/* Enhanced UX Heatmap Visualization based on real coordinates */}
                                    <div className="relative w-full max-w-[600px] aspect-video bg-white rounded shadow-2xl overflow-hidden opacity-90 border-4 border-gray-800">
                                        {/* Website Wireframe (Static Backplate) */}
                                        <div className="h-12 border-b flex items-center px-4 gap-4 bg-gray-50">
                                            <div className="w-20 h-4 bg-gray-300 rounded"></div>
                                            <div className="flex-1"></div>
                                            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                        </div>
                                        <div className="p-6 flex gap-6 h-full">
                                            <div className="w-1/2 h-4/5 bg-gray-100 rounded"></div>
                                            <div className="flex-1 space-y-4">
                                                <div className="w-3/4 h-8 bg-gray-200 rounded"></div>
                                                <div className="w-full h-24 bg-gray-100 rounded"></div>
                                                <div className="w-1/2 h-10 bg-brand-primary/50 rounded mt-8"></div>
                                            </div>
                                        </div>
                                        {/* Real Heatmap Overlay */}
                                        <div className="absolute inset-0 mix-blend-multiply pointer-events-none">
                                            {heatmapPoints.map((pt, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute rounded-full blur-2xl"
                                                    style={{
                                                        left: `${pt.x_coordinate}%`,
                                                        top: `${pt.y_coordinate}%`,
                                                        width: `${80 * pt.intensity}px`,
                                                        height: `${80 * pt.intensity}px`,
                                                        background: `radial-gradient(circle, rgba(255,0,0,${pt.intensity}) 0%, rgba(255,255,0,${pt.intensity * 0.5}) 50%, transparent 70%)`,
                                                        transform: 'translate(-50%, -50%)'
                                                    }}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <LiveGlobe className="w-full h-full" markers={globeMarkers} />
                            )}
                        </div>
                    </Card>

                    <Card className="flex flex-col h-full overflow-hidden">
                        <CardHeader><CardTitle>Real-Time Activity</CardTitle></CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            <div className="space-y-4 pr-2">
                                {liveActivity.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700 animate-in slide-in-from-right-4 fade-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 shrink-0 shadow-sm animate-pulse"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.action}</p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{item.time}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.user} • {item.location}</p>
                                            {item.value && <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">{item.value}</p>}
                                        </div>
                                    </div>
                                ))}
                                {liveActivity.length === 0 && <div className="text-center text-gray-500 p-4">No recent activity detected.</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <ImportExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                type="export"
                entityName="Analytics Report"
            />
        </div>
    );
};
