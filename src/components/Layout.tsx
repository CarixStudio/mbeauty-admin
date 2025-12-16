
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Package,
  FileText,
  MessageSquare,
  BarChart,
  Tag,
  ChevronDown,
  Database,
  Bot,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Zap,
  UserPlus,
  Inbox,
  Layers,
  User,
  Moon,
  Sun,
  Camera,
  Keyboard,
  Command as CommandIcon,
  ArrowRight
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command"
import { VisualSearchModal } from './VisualSearchModal';
import type { CurrencyConfig, UserProfile } from '../App';
import { ScrollToTop } from './ui/ScrollToTop';
import { SimpleTooltip } from './ui/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string, id?: string | number, mode?: 'list' | 'create' | 'edit' | 'detail' | 'live') => void;
  onLogout: () => void;
  currency: CurrencyConfig;
  setCurrency: (currency: CurrencyConfig) => void;
  userProfile?: UserProfile | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, onLogout, currency, setCurrency, userProfile }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Real Notification Count State
  const [unreadCount, setUnreadCount] = useState(0);

  // Command Palette State
  const [openCommand, setOpenCommand] = useState(false);

  // Header Search State
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [showHeaderResults, setShowHeaderResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const headerSearchRef = useRef<HTMLDivElement>(null);

  // Search Results
  const [searchResults, setSearchResults] = useState<{ products: any[], customers: any[], orders: any[] }>({ products: [], customers: [], orders: [] });

  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const isVisuallyExpanded = !isCollapsed || (isCollapsed && isSidebarHovered);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Fetch Unread Notifications Count (Initial + Realtime)
  useEffect(() => {
    if (!supabase) return;

    const fetchCount = async () => {
      try {
        // Strictly count rows where is_read is FALSE
        const { count, error } = await supabase
          .from('admin_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false); // Ensure boolean false

        if (!error) {
          setUnreadCount(count || 0);
        }
      } catch (e) {
        console.error("Failed to fetch notification count", e);
      }
    };

    // Initial Fetch
    fetchCount();

    // Subscribe to changes for instant updates
    const subscription = supabase
      .channel('public:notifications_count_agg')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Search Logic
  useEffect(() => {
    if (!headerSearchQuery || headerSearchQuery.length < 2) {
      setSearchResults({ products: [], customers: [], orders: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (!supabase) return;
      const term = `%${headerSearchQuery}%`;

      const [products, customers, orders] = await Promise.all([
        supabase.from('products').select('id, name').ilike('name', term).limit(3),
        supabase.from('customers').select('id, full_name').ilike('full_name', term).limit(3),
        supabase.from('orders').select('id, order_number, customers(full_name)').or(`order_number.ilike.${term}`).limit(3)
      ]);

      setSearchResults({
        products: products.data || [],
        customers: customers.data || [],
        orders: orders.data?.map((o: any) => ({ id: o.id, customer: o.customers?.full_name, displayId: o.order_number })) || []
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [headerSearchQuery]);

  const toggleDarkMode = () => setIsDark(!isDark);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
      // Cmd/Ctrl + /: Show Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((open) => !open);
      }
      // Esc: Close sidebar if open on mobile
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dropdown-trigger')) {
        setShowQuickActions(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
      if (headerSearchRef.current && !headerSearchRef.current.contains(e.target as Node)) {
        setShowHeaderResults(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed && !isSidebarHovered) setIsCollapsed(false);
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const hasHeaderResults = searchResults.products.length > 0 || searchResults.customers.length > 0 || searchResults.orders.length > 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Layers },
    {
      id: 'customers-group', label: 'Customers', icon: Users, isGroup: true, children: [
        { id: 'customers', label: 'Customer List' },
        { id: 'segmentation', label: 'Segmentation' },
        { id: 'waitlist', label: 'Waitlist' },
        { id: 'abandoned-carts', label: 'Abandoned Carts' },
      ]
    },
    {
      id: 'marketing', label: 'Marketing', icon: Tag, isGroup: true, children: [
        { id: 'banners', label: 'Banners' },
        { id: 'promotions', label: 'Promotions' },
        { id: 'subscribers', label: 'Subscribers' },
      ]
    },
    {
      id: 'analytics-group', label: 'Analytics', icon: BarChart, isGroup: true, children: [
        { id: 'analytics', label: 'Dashboard' },
        { id: 'sentiment-analysis', label: 'Sentiment AI' },
      ]
    },
    {
      id: 'content', label: 'Content', icon: FileText, isGroup: true, children: [
        { id: 'reviews', label: 'Reviews' },
      ]
    },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: MessageSquare },
    {
      id: 'settings', label: 'Settings', icon: Settings, isGroup: true, children: [
        { id: 'shipping', label: 'Shipping' },
        { id: 'sessions', label: 'Sessions' },
        { id: 'admins', label: 'Admins' },
        { id: 'audit-logs', label: 'Audit Logs' },
        { id: 'scheduled-actions', label: 'Scheduled Actions' },
      ]
    },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
  ];

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    let newCurrency: CurrencyConfig;
    switch (code) {
      case 'NGN': newCurrency = { code: 'NGN', symbol: '₦', rate: 1500 }; break;
      case 'EUR': newCurrency = { code: 'EUR', symbol: '€', rate: 0.92 }; break;
      case 'GBP': newCurrency = { code: 'GBP', symbol: '£', rate: 0.79 }; break;
      default: newCurrency = { code: 'USD', symbol: '$', rate: 1 };
    }
    setCurrency(newCurrency);
  };

  // Helper for Sidebar Item Classes
  const getSidebarItemClass = (isActive: boolean) => {
    return `
      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-1 group relative
      ${isActive
        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25 dark:bg-white dark:text-gray-900'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
      }
    `;
  };

  const getSubItemClass = (isActive: boolean) => {
    return `
      w-full flex items-center gap-3 pl-12 pr-3 py-2.5 rounded-lg text-sm transition-all relative
      ${isActive
        ? 'text-brand-primary dark:text-white font-semibold bg-brand-light/50 dark:bg-gray-800'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }
    `;
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-[#171717] flex transition-all duration-300">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Container */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 relative z-50`}>
        <aside
          className={`
               fixed top-0 h-screen bg-white dark:bg-[#1f1f1f] dark:border-gray-800 border-r border-gray-200 
               flex flex-col transition-all duration-300 ease-in-out overflow-hidden
               ${isVisuallyExpanded ? 'w-64 shadow-2xl' : 'w-20'}
            `}
          style={{ willChange: 'width' }}
          onMouseEnter={() => isCollapsed && setIsSidebarHovered(true)}
          onMouseLeave={() => isCollapsed && setIsSidebarHovered(false)}
        >
          <div className={`h-20 flex items-center ${!isVisuallyExpanded ? 'justify-center px-0' : 'px-6'} border-b border-gray-100 dark:border-gray-800 flex-shrink-0 transition-all duration-300`}>
            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-[#5a5752] rounded-xl flex items-center justify-center text-white dark:text-white font-bold text-xl shrink-0 shadow-lg shadow-brand-primary/20" title="Momoh Admin">M</div>
            <span className={`font-bold text-xl text-brand-primary dark:text-white tracking-tight ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${!isVisuallyExpanded ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Momoh Admin</span>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id || (item.isGroup && item.children?.some(c => activePage === c.id));

              if (!isVisuallyExpanded) {
                return (
                  <div key={item.id} className="relative group my-2 flex justify-center">
                    <SimpleTooltip content={item.label} side="right">
                      <button
                        onClick={() => {
                          if (item.isGroup) {
                            setIsCollapsed(false);
                            if (!expandedGroups.includes(item.id)) toggleGroup(item.id);
                          } else {
                            onNavigate(item.id);
                          }
                        }}
                        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'}`}
                      >
                        <Icon size={22} />
                        {item.id === 'notifications' && unreadCount > 0 && (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1f1f1f]"></span>
                        )}
                      </button>
                    </SimpleTooltip>
                  </div>
                )
              }

              if (item.isGroup) {
                const isExpanded = expandedGroups.includes(item.id);
                return (
                  <div key={item.id} className="space-y-1 mb-2">
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? 'text-brand-primary dark:text-white bg-brand-light/30 dark:bg-gray-800/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className={isActive ? 'text-brand-accent' : 'text-gray-400'} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronDown size={14} className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="space-y-1 mt-1 mb-2 ml-1 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                        {item.children?.map(child => (
                          <button
                            key={child.id}
                            onClick={() => {
                              onNavigate(child.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${activePage === child.id
                              ? 'text-brand-primary dark:text-white font-medium bg-white dark:bg-gray-800 shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                          >
                            <span className="truncate">{child.label}</span>
                            {activePage === child.id && <div className="absolute right-2 w-1.5 h-1.5 bg-brand-accent rounded-full"></div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={getSidebarItemClass(isActive ?? false)}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Icon size={20} className={isActive ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'} />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Mobile Sidebar (Drawer) with Glassmorphism */}
      <aside className={`
        fixed top-0 h-screen z-[60] bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl dark:border-gray-800 border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col lg:hidden w-[85%] max-w-[320px] shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 justify-between bg-white/50 dark:bg-black/20">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white dark:text-gray-900 font-bold text-xl shrink-0">M</div>
            <span className="font-bold text-xl text-brand-primary dark:text-white tracking-tight ml-3">Momoh</span>
          </div>
          <button className="text-gray-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id || (item.isGroup && item.children?.some(c => activePage === c.id));

            if (item.isGroup) {
              const isExpanded = expandedGroups.includes(item.id);
              return (
                <div key={item.id} className="space-y-1 mb-2">
                  <button onClick={() => toggleGroup(item.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'text-brand-primary dark:text-white bg-brand-light/50 dark:bg-gray-800/50' : 'text-gray-600 dark:text-gray-400'}`}>
                    <div className="flex items-center gap-3"><Icon size={22} /><span className="truncate">{item.label}</span></div>
                    <ChevronDown size={18} className={isExpanded ? 'rotate-180' : ''} />
                  </button>
                  {isExpanded && item.children?.map(child => (
                    <button key={child.id} onClick={() => { onNavigate(child.id); setIsSidebarOpen(false); }} className={getSubItemClass(activePage === child.id)}>
                      <span className="truncate">{child.label}</span>
                    </button>
                  ))}
                </div>
              )
            }
            return (
              <button key={item.id} onClick={() => { onNavigate(item.id); setIsSidebarOpen(false); }} className={getSidebarItemClass(isActive ?? false)}>
                <div className="flex items-center gap-3 w-full">
                  <Icon size={22} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
                  )}
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative">

        {/* Top Header - Sticky & Glassmorphic */}
        <header className="h-20 sticky top-0 bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-40 transition-all duration-200">
          {/* Left Side: Collapse & Search */}
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsSidebarOpen(true)}
              title="Open Menu"
            >
              <Menu size={24} />
            </button>
            <SimpleTooltip content={isCollapsed ? "Lock Sidebar Open" : "Collapse Sidebar"}>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </SimpleTooltip>

            {/* Header Search Input */}
            <div className={`flex items-center relative transition-all duration-300 ${isMobileSearchOpen ? 'flex-1' : 'w-auto'}`} ref={headerSearchRef}>
              <button
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              >
                <Search size={22} />
              </button>

              <div className={`${isMobileSearchOpen ? 'flex' : 'hidden'} md:flex relative w-full md:w-72 lg:w-96`}>
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-full pl-11 pr-16 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 rounded-xl text-sm text-gray-900 dark:text-white outline-none transition-all shadow-sm focus:shadow-md focus:bg-white dark:focus:bg-black"
                  value={headerSearchQuery}
                  onChange={(e) => {
                    setHeaderSearchQuery(e.target.value);
                    setShowHeaderResults(true);
                  }}
                  onFocus={() => setShowHeaderResults(true)}
                  // Removing onBlur here or moving its logic.
                  // Instead we rely on the click handler of the items and click outside listener
                  autoFocus={isMobileSearchOpen}
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <SimpleTooltip content="Visual Search">
                    <button
                      className="text-gray-400 hover:text-brand-accent p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVisualSearchOpen(true);
                      }}
                    >
                      <Camera size={16} />
                    </button>
                  </SimpleTooltip>

                  {/* Keycap Badge Style - Optimized with Active State */}
                  <div
                    className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-[10px] font-bold text-gray-500 dark:text-gray-400 select-none cursor-pointer active:border-b-0 active:translate-y-0.5 active:mt-0.5 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setOpenCommand(true)}
                    title="Command Palette (Cmd+K)"
                  >
                    <span className="text-xs">⌘</span>K
                  </div>
                </div>
              </div>

              {/* Header Search Suggestions Dropdown */}
              {showHeaderResults && headerSearchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top">
                  {!hasHeaderResults ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No results found for "{headerSearchQuery}"
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.products.length > 0 && (
                        <div className="py-2">
                          <h4 className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Products</h4>
                          {searchResults.products.map((p: any) => (
                            <button
                              key={p.id}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur
                              onClick={() => { onNavigate('products', p.id, 'detail'); setShowHeaderResults(false); setIsMobileSearchOpen(false); setHeaderSearchQuery(''); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                            >
                              <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded"><Package size={14} /></div>
                              <span className="text-sm text-gray-700 dark:text-gray-200">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.customers.length > 0 && (
                        <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Customers</h4>
                          {searchResults.customers.map((c: any) => (
                            <button
                              key={c.id}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur
                              onClick={() => { onNavigate('customers', c.id, 'detail'); setShowHeaderResults(false); setIsMobileSearchOpen(false); setHeaderSearchQuery(''); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                            >
                              <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded"><Users size={14} /></div>
                              <span className="text-sm text-gray-700 dark:text-gray-200">{c.full_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.orders.length > 0 && (
                        <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</h4>
                          {searchResults.orders.map((o: any) => (
                            <button
                              key={o.id}
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur
                              onClick={() => { onNavigate('orders', o.id, 'detail'); setShowHeaderResults(false); setIsMobileSearchOpen(false); setHeaderSearchQuery(''); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                            >
                              <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded"><ShoppingBag size={14} /></div>
                              <span className="text-sm text-gray-700 dark:text-gray-200">{o.displayId} - {o.customer}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Actions & Profile */}
          <div className={`${isMobileSearchOpen ? 'hidden' : 'flex'} items-center gap-2 sm:gap-4`}>
            <div className="hidden sm:block relative">
              <select
                value={currency.code}
                onChange={handleCurrencyChange}
                className="appearance-none bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 cursor-pointer transition-all"
              >
                <option value="USD">🇺🇸 USD</option>
                <option value="NGN">🇳🇬 NGN</option>
                <option value="EUR">🇪🇺 EUR</option>
                <option value="GBP">🇬🇧 GBP</option>
              </select>
            </div>

            <SimpleTooltip content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-400 dark:text-gray-300 hover:text-brand-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </SimpleTooltip>

            <SimpleTooltip content="Keyboard Shortcuts (Cmd+/)">
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="p-2 text-gray-400 dark:text-gray-300 hover:text-brand-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors hidden sm:block"
              >
                <Keyboard size={20} />
              </button>
            </SimpleTooltip>

            <div className="relative dropdown-trigger">
              <SimpleTooltip content="Quick Actions">
                <button
                  className={`flex items-center gap-2 text-sm font-medium px-2 md:px-3 py-2 rounded-lg transition-colors ${showQuickActions ? 'bg-brand-light text-brand-primary dark:bg-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-brand-primary hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  onClick={(e) => { e.stopPropagation(); setShowQuickActions(!showQuickActions); }}
                >
                  <Zap size={18} />
                  <span className="hidden lg:inline">Actions</span>
                </button>
              </SimpleTooltip>

              {showQuickActions && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 origin-top-right z-50">
                  <button onClick={() => { onNavigate('products', undefined, 'create'); setShowQuickActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                    <PlusCircle size={16} className="text-brand-accent" /> Add Product
                  </button>
                  <button onClick={() => { onNavigate('orders'); setShowQuickActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-brand-accent" /> Create Order
                  </button>
                  <button onClick={() => { onNavigate('customers'); setShowQuickActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                    <UserPlus size={16} className="text-brand-accent" /> Add Customer
                  </button>
                </div>
              )}
            </div>

            <div className="relative dropdown-trigger">
              <SimpleTooltip content="Notifications">
                <button
                  className={`p-2 rounded-lg transition-colors ${showNotifications ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1f1f1f] animate-pulse"></span>
                  )}
                </button>
              </SimpleTooltip>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                      {unreadCount > 0 && <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </h3>
                    <button
                      className="text-xs text-brand-primary hover:underline"
                      onClick={() => { onNavigate('notifications'); setShowNotifications(false); }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {/* We can also fetch recent here, but for simplicity relying on navigating to full page */}
                    <div className="p-4 text-center text-sm text-gray-500">
                      {unreadCount > 0 ? `${unreadCount} unread alerts pending.` : 'No new notifications.'}
                      <br />
                      <button className="text-brand-primary mt-2 text-xs hover:underline" onClick={() => onNavigate('notifications')}>Go to Notifications Page</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

            <div className={`flex items-center gap-3 transition-all cursor-pointer dropdown-trigger relative`} onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }} title="User Profile">
              <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600">
                <img src={userProfile?.avatar || "https://ui-avatars.com/api/?name=Admin&background=random"} alt="Admin" className="w-full h-full object-cover" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{userProfile?.name || 'Loading...'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.role || 'User'}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden md:block" />

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#262626] rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userProfile?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                    <div className="mt-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">{userProfile?.role}</div>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => onNavigate('user-settings')}>
                    <User size={14} /> Profile & Preferences
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => onNavigate('settings')}>
                    <Settings size={14} /> Store Settings
                  </button>
                  <div className="border-t border-gray-50 dark:border-gray-700 my-1"></div>
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2" onClick={onLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Body with Scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-brand-light dark:bg-[#171717] scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
          <ScrollToTop />
        </main>

      </div>

      {/* Global Command Menu */}
      <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {navItems.map(item => (
              <CommandItem key={item.id} onSelect={() => { onNavigate(item.id); setOpenCommand(false); }}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          {/* We could add dynamic results here using similar logic to header search if needed */}
        </CommandList>
      </CommandDialog>

      {/* Improved Shortcuts Help Modal */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="max-w-md w-[90%] rounded-xl dark:bg-[#262626] dark:border-gray-700 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Keyboard size={24} className="text-brand-accent" /> Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 pt-4">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Global Search</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Cmd</kbd>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">K</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Show Shortcuts</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Cmd</kbd>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">/</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Close Modals</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Esc</kbd>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => setIsShortcutsOpen(false)}
              className="flex items-center gap-2 text-sm text-brand-primary hover:text-brand-accent transition-colors"
            >
              Got it <ArrowRight size={14} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visual Search Modal */}
      {isVisualSearchOpen && (
        <VisualSearchModal onClose={() => setIsVisualSearchOpen(false)} />
      )}
    </div>
  );
};
