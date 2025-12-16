
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  CheckCircle, 
  ShoppingBag, 
  User, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Trash2, 
  Check,
  Star,
  Package,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

// Unified Notification Interface
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  isRead: boolean;
  link_url?: string;
}

export const NotificationsPage: React.FC = () => {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'order' | 'system' | 'customer'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchNotifications();
      
      // Real-time subscription for new notifications
      if (!supabase) return;
      const subscription = supabase
        .channel('public:admin_notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
            fetchNotifications();
        })
        .subscribe();

      return () => {
          supabase.removeChannel(subscription);
      };
  }, []);

  const fetchNotifications = async () => {
      if (!supabase) return;
      // Don't set loading on refetch to avoid flicker
      if (notifications.length === 0) setLoading(true);
      
      try {
          // Fetch strictly from the single source of truth table
          const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) throw error;

          const mapped: NotificationItem[] = (data || []).map((n: any) => ({
              id: n.id,
              type: n.type, // 'order', 'customer', 'stock', etc.
              title: n.title,
              message: n.message,
              time: new Date(n.created_at).toLocaleString(),
              timestamp: new Date(n.created_at).getTime(),
              isRead: n.is_read,
              link_url: n.link_url
          }));

          setNotifications(mapped);
      } catch (error) {
          console.error("Notifications Fetch Error:", error);
          addToast('Failed to load notifications', 'error');
      } finally {
          setLoading(false);
      }
  };

  // Filtering Logic
  const filteredNotifications = notifications.filter(n => {
    // 1. Tab Filter
    let matchesTab = true;
    if (activeTab === 'order') matchesTab = n.type === 'order';
    if (activeTab === 'customer') matchesTab = n.type === 'customer' || n.type === 'review' || n.type === 'support';
    if (activeTab === 'system') matchesTab = ['stock', 'security', 'system'].includes(n.type);
    
    // 2. Unread Filter
    if (activeTab === 'unread') {
        return !n.isRead;
    }

    return matchesTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Handlers
  const markAllRead = async () => {
    if (notifications.some(n => !n.isRead) && supabase) {
        // Optimistic Update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        
        try {
            const { error } = await supabase
                .from('admin_notifications')
                .update({ is_read: true })
                .eq('is_read', false);
            
            if (error) throw error;
            addToast('All notifications marked as read', 'success');
        } catch (e) {
            fetchNotifications(); // Revert on error
        }
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic UI Update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

    if (supabase) {
        await supabase
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('id', id);
    }
  };

  const deleteNotification = async (id: string) => {
    // Optimistic UI Update
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (supabase) {
        await supabase
            .from('admin_notifications')
            .delete()
            .eq('id', id);
        addToast('Notification deleted', 'info');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingBag size={18} className="text-blue-500" />;
      case 'customer': return <User size={18} className="text-green-500" />;
      case 'stock': return <Package size={18} className="text-amber-500" />;
      case 'review': return <Star size={18} className="text-yellow-500" />;
      case 'security': return <ShieldAlert size={18} className="text-red-500" />;
      case 'support': return <MessageSquare size={18} className="text-purple-500" />;
      default: return <Info size={18} className="text-gray-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'customer': return 'bg-green-50 dark:bg-green-900/20';
      case 'stock': return 'bg-amber-50 dark:bg-amber-900/20';
      case 'review': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'security': return 'bg-red-50 dark:bg-red-900/20';
      case 'support': return 'bg-purple-50 dark:bg-purple-900/20';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
            Notifications 
            {unreadCount > 0 && <span className="text-sm font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} Unread</span>}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time system activity and alerts.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCircle size={16} className="mr-2"/> Mark all as read
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Filter Sidebar */}
         <div className="lg:col-span-1">
            <Card className="p-2 sticky top-24">
               <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
                  {[
                     { id: 'all', label: 'All Notifications', icon: Bell },
                     { id: 'unread', label: 'Unread Only', icon: AlertTriangle },
                     { id: 'order', label: 'Orders', icon: ShoppingBag },
                     { id: 'customer', label: 'Customers & Reviews', icon: User },
                     { id: 'system', label: 'System & Stock', icon: Info },
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                           activeTab === tab.id 
                              ? 'bg-brand-light text-brand-primary dark:bg-gray-800 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                     >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.id === 'unread' && unreadCount > 0 && (
                           <span className="ml-auto bg-brand-accent text-white text-xs px-1.5 rounded-full">{unreadCount}</span>
                        )}
                     </button>
                  ))}
               </div>
            </Card>
         </div>

         {/* Notifications List */}
         <div className="lg:col-span-3 space-y-4">
            {loading ? (
                <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
                    <p className="text-sm text-gray-500">Syncing database...</p>
                </div>
            ) : filteredNotifications.length > 0 ? (
               filteredNotifications.map((notification) => (
                  <div 
                     key={notification.id} 
                     className={`group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                        notification.isRead 
                           ? 'bg-white dark:bg-[#262626] border-gray-100 dark:border-gray-700 opacity-70 hover:opacity-100' 
                           : 'bg-white dark:bg-[#262626] border-brand-accent/30 shadow-[0_0_0_1px_rgba(212,165,116,0.1)]'
                     }`}
                  >
                     <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getBgColor(notification.type)}`}>
                           {getIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h3 className={`text-sm font-semibold ${notification.isRead ? 'text-gray-900 dark:text-white' : 'text-brand-primary dark:text-brand-accent'}`}>
                                    {notification.title}
                                    {!notification.isRead && <span className="ml-2 w-2 h-2 inline-block rounded-full bg-brand-accent animate-pulse"></span>}
                                 </h3>
                                 <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{notification.time}</span>
                           </div>
                        </div>
                     </div>

                     {/* Hover Actions */}
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#262626] pl-2">
                        {!notification.isRead && (
                           <button 
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title="Mark as read"
                           >
                              <Check size={16} />
                           </button>
                        )}
                        <button 
                           onClick={() => deleteNotification(notification.id)}
                           className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                           title="Delete"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
               ))
            ) : (
               <div className="text-center py-12 bg-white dark:bg-[#262626] rounded-xl border border-gray-100 dark:border-gray-700 border-dashed">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Bell size={20} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications found.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
