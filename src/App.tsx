

import React, { useState, useEffect, useRef } from 'react';
import { LoginForm } from './components/LoginForm';
import { VisualPanel } from './components/VisualPanel';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { OrdersPage } from './pages/Orders';
import { ProductsPage } from './pages/Products';
import { CategoriesPage } from './pages/Categories';
import { CustomersPage } from './pages/Customers';
import { AdminsPage } from './pages/Admins';
import { MarketingPage } from './pages/Marketing';
import { ReviewsPage } from './pages/Reviews';
import { SupportPage } from './pages/Support';
import { AnalyticsPage } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { DatabasePage } from './pages/Database';
import { AIPage } from './pages/AI';
import { NotificationsPage } from './pages/Notifications';
import { UserSettingsPage } from './pages/UserSettings';
import { SegmentationPage } from './pages/Segmentation';
import { AuditLogsPage } from './pages/AuditLogs';
import { AbandonedCartsPage } from './pages/AbandonedCarts';
import { SentimentAnalysisPage } from './pages/SentimentAnalysis';
import { WaitlistPage } from './pages/Waitlist';
import { ScheduledActionsPage } from './pages/ScheduledActions';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IdleTimeoutModal } from './components/IdleTimeoutModal';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/AlertDialog';
import { TooltipProvider } from './components/ui/Tooltip';
import { useIdleTimeout } from './lib/useIdleTimeout';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

interface NavState {
  page: string;
  id?: string | number;
  subPage?: string;
  mode?: 'list' | 'create' | 'edit' | 'detail' | 'live';
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

// Idle Timeout Wrapper Component (15 min industry standard)
const IdleTimeoutWrapper: React.FC<{ onLogout: () => void; children: React.ReactNode }> = ({ onLogout, children }) => {
  const { showWarning, secondsRemaining, stayLoggedIn } = useIdleTimeout({
    timeoutMinutes: 15,
    warningSeconds: 60,
    onTimeout: onLogout,
    enabled: true
  });

  return (
    <>
      {children}
      {showWarning && (
        <IdleTimeoutModal
          secondsRemaining={secondsRemaining}
          onStayLoggedIn={stayLoggedIn}
          onLogout={onLogout}
        />
      )}
    </>
  );
};

// Wrapper to provide toast context to AppContent
const App = () => {
  return (
    <TooltipProvider>
      <ConfirmProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ConfirmProvider>
    </TooltipProvider>
  );
};

const AppContent = () => {
  const { addToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);
  
  // Loading & Auth State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAppReady, setIsAppReady] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Session Tracking Refs
  const currentSessionToken = useRef<string | null>(null);
  const heartbeatInterval = useRef<any>(null);

  // Currency State
  const [currency, setCurrency] = useState<CurrencyConfig>({ code: 'USD', symbol: '$', rate: 1 });

  // Navigation State
  const [navState, setNavState] = useState<NavState>({ page: 'dashboard' });

  // 1. Loading Animation Logic
  useEffect(() => {
    // If auth check is done, force completion
    if (!isCheckingAuth && loadingProgress >= 90) {
        setLoadingProgress(100);
        setTimeout(() => {
            setIsAppReady(true);
            setTimeout(() => setShowLoadingOverlay(false), 600);
        }, 400);
        return;
    }

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        // Stick at 90% if still checking auth
        if (prev >= 90 && isCheckingAuth) return 90;
        // Don't go past 95% automatically
        if (prev >= 95) return 95;
        return prev + Math.random() * 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isCheckingAuth, loadingProgress]);

  // --- Session Management Functions (BACKGROUND ONLY) ---

  const registerSession = (user: any, token: string) => {
      if (!user || !token) return;
      if (currentSessionToken.current === token) return;
      currentSessionToken.current = token;

      // Fire and forget - do not await
      setTimeout(async () => {
          try {
            // Simple IP fetch with short timeout
            let ip = '127.0.0.1';
            try {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 1000);
                const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                const data = await res.json();
                ip = data.ip;
            } catch (e) { /* ignore */ }

            const userAgent = navigator.userAgent;
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await supabase.from('user_sessions').upsert({
                user_id: user.id,
                session_token: token, 
                ip_address: ip,
                user_agent: userAgent,
                is_valid: true,
                last_activity: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                token_version: 1
            }, { onConflict: 'session_token' });
            
            startHeartbeat(token, user.id);
          } catch (e) {
            console.warn("Session registration skipped");
          }
      }, 100); // Slight delay to let UI render first
  };

  const startHeartbeat = (token: string, userId: string) => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      
      // Update last_activity every minute
      heartbeatInterval.current = setInterval(async () => {
          const now = new Date().toISOString();
          // Totally disconnected from UI state
          supabase.from('user_sessions').update({ last_activity: now }).eq('session_token', token).then(() => {});
          supabase.from('admin_profiles').update({ last_active: now }).eq('id', userId).then(() => {});
          supabase.from('customers').update({ last_active_at: now }).eq('id', userId).then(() => {});
      }, 60000); 
  };

  const endSession = async () => {
      if (currentSessionToken.current) {
          supabase.from('user_sessions').delete().eq('session_token', currentSessionToken.current).then(() => {});
          currentSessionToken.current = null;
      }
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
  };

  // 2. Robust Auth Check & Listener
  const initAuth = async () => {
      setIsCheckingAuth(true);
      setAuthError(null);
      try {
        // 10s timeout for initial check
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000));
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (error) {
            console.warn("Auth warning:", error.message);
            setIsAuthenticated(false);
        } else if (session?.user) {
            setIsAuthenticated(true);
            // Background tasks
            loadUserProfile(session.user);
            registerSession(session.user, session.access_token);
        } else {
            setIsAuthenticated(false);
            setUserProfile(null);
        }
      } catch (error: any) {
        console.error("Auth Init Error:", error);
        setAuthError(error.message || "Connection failed");
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
  };

  useEffect(() => {
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
          endSession(); 
          setIsAuthenticated(false);
          setUserProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
          loadUserProfile(session.user);
          registerSession(session.user, session.access_token);
      }
    });

    return () => {
        subscription.unsubscribe();
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, []);

  const loadUserProfile = async (user: any) => {
      // Optimistic set
      const metaName = user.user_metadata?.full_name || 'Admin User';
      const defaultProfile = {
          name: metaName,
          email: user.email || '',
          role: 'Viewer',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(metaName)}&background=random`
      };
      setUserProfile(defaultProfile);

      // Then fetch real
      try {
        const { data: profile } = await supabase.from('admin_profiles').select('*').eq('id', user.id).single();
        if (profile) {
            setUserProfile({
                name: profile.full_name || metaName,
                email: user.email || '',
                role: profile.role || 'Viewer',
                avatar: profile.avatar_url || defaultProfile.avatar
            });
        }
      } catch (e) { /* ignore */ }
  };

  // Online/Offline Status Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineAlert(true);
      setTimeout(() => setShowOnlineAlert(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    endSession(); 
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserProfile(null);
    setNavState({ page: 'dashboard' });
    addToast('Signed out successfully', 'info');
  };

  const handleNavigate = (page: string, id?: string | number, mode?: 'list'|'edit'|'create'|'detail'|'live') => {
    setNavState({ page, id, mode: mode || 'list' });
  };

  const renderPage = () => {
    switch (navState.page) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} currency={currency} />;
      case 'orders': return <OrdersPage navState={navState} onNavigate={handleNavigate} />;
      case 'products': return <ProductsPage navState={navState} onNavigate={handleNavigate} currency={currency} />;
      case 'categories': return <CategoriesPage />;
      case 'customers': return <CustomersPage navState={navState} onNavigate={handleNavigate} />;
      case 'segmentation': return <SegmentationPage navState={navState} onNavigate={handleNavigate} />;
      case 'admins': return <AdminsPage />;
      case 'banners': 
      case 'promotions': 
      case 'subscribers': 
      case 'marketing':
        return <MarketingPage activeTab={navState.page === 'marketing' ? 'banners' : navState.page} />;
      case 'abandoned-carts': return <AbandonedCartsPage />;
      case 'waitlist': return <WaitlistPage />;
      case 'reviews': return <ReviewsPage />;
      case 'support': return <SupportPage />;
      case 'analytics': return <AnalyticsPage navState={navState} />;
      case 'sentiment-analysis': return <SentimentAnalysisPage />;
      case 'shipping':
      case 'sessions':
      case 'settings':
         return <SettingsPage activeTab={navState.page === 'settings' ? 'shipping' : navState.page} />;
      case 'audit-logs': return <AuditLogsPage />;
      case 'scheduled-actions': return <ScheduledActionsPage />;
      case 'database': return <DatabasePage />;
      case 'ai': return <AIPage />;
      case 'notifications': return <NotificationsPage />;
      case 'user-settings': return <UserSettingsPage />;
      default: return <Dashboard onNavigate={handleNavigate} currency={currency} />;
    }
  };

  // Error State Render
  if (authError && !isCheckingAuth && !isAuthenticated) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-brand-light p-4">
              <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <WifiOff size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Issue</h2>
                  <p className="text-gray-500 mb-6">{authError}. The database might be unreachable.</p>
                  <button 
                    onClick={() => initAuth()}
                    className="w-full py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} /> Retry Connection
                  </button>
              </div>
          </div>
      );
  }

  return (
    <>
      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div 
          className={`fixed inset-0 z-[100] bg-brand-primary flex items-center justify-center transition-transform duration-700 ease-in-out ${isAppReady ? '-translate-y-full' : 'translate-y-0'}`}
        >
          <div className="flex flex-col items-center">
             <div className="w-24 h-24 mb-8 bg-brand-light rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                <span className="text-brand-primary text-5xl font-bold relative z-10">M</span>
                <div className="absolute bottom-0 left-0 right-0 bg-brand-accent/20 transition-all duration-300 ease-out" style={{ height: `${loadingProgress}%` }}></div>
             </div>
             <div className="text-brand-light font-mono text-6xl font-bold tracking-tighter">
                {Math.round(loadingProgress)}%
             </div>
             <p className="text-brand-accent/80 text-sm mt-4 tracking-widest uppercase">Initializing Momoh Beauty...</p>
          </div>
        </div>
      )}

      {/* Network Status Alerts */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold text-center py-2 z-[200] flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
          <WifiOff size={14} /> You are currently offline. Changes may not be saved.
        </div>
      )}
      {isOnline && showOnlineAlert && (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white text-xs font-bold text-center py-2 z-[200] flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top fade-out duration-1000">
          <Wifi size={14} /> Connection restored. You are back online.
        </div>
      )}

      {isAuthenticated ? (
        <IdleTimeoutWrapper onLogout={handleLogout}>
          <div className="animate-in fade-in duration-700">
            <ErrorBoundary>
              <Layout 
                activePage={navState.page} 
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                currency={currency}
                setCurrency={setCurrency}
                userProfile={userProfile}
              >
                {renderPage()}
              </Layout>
            </ErrorBoundary>
          </div>
        </IdleTimeoutWrapper>
      ) : (
        /* Only render login if we aren't stuck checking auth */
        !isCheckingAuth && (
            <div className="min-h-screen w-full bg-brand-light flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
            <div className="bg-white w-full max-w-[1400px] min-h-[800px] h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-full lg:w-[45%] xl:w-[40%] h-full relative z-10">
                <LoginForm onLoginSuccess={() => {}} />
                </div>
                <div className="hidden lg:block w-full lg:w-[55%] xl:w-[60%] h-full relative bg-brand-primary overflow-hidden">
                <VisualPanel />
                </div>
            </div>
            </div>
        )
      )}
    </>
  );
}

export default App;
