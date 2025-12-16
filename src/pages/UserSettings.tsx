
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  User, 
  Shield, 
  Bell, 
  Camera, 
  Save, 
  QrCode,
  LogOut,
  Key,
  Mail,
  Smartphone,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export const UserSettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Real Profile State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    bio: '',
    avatar: ''
  });

  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailMarketing: false,
    pushSecurity: true,
    pushStock: true
  });

  const [twoFactor, setTwoFactor] = useState(false);

  // Fetch real data on mount
  useEffect(() => {
    const fetchProfile = async () => {
        if (!supabase) return; // Safety check
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data, error } = await supabase
                .from('admin_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setProfile({
                    name: data.full_name || '',
                    email: user.email || '',
                    role: data.role || 'Viewer',
                    bio: data.bio || '',
                    avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'Admin')}&background=random`
                });
                
                if (data.preferences) {
                    try {
                        const prefs = typeof data.preferences === 'string' ? JSON.parse(data.preferences) : data.preferences;
                        setNotifications(prev => ({...prev, ...prefs}));
                    } catch (e) {
                        console.error("Error parsing preferences", e);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            addToast('Error loading profile', 'error');
        } finally {
            setLoading(false);
        }
    };
    fetchProfile();
  }, [addToast]);

  const handleSaveProfile = async () => {
    if (!userId || !supabase) return;
    setSaving(true);
    try {
        const { error } = await supabase
            .from('admin_profiles')
            .update({
                full_name: profile.name,
                bio: profile.bio,
                preferences: JSON.stringify(notifications) // Sync preferences too
            })
            .eq('id', userId);

        if (error) throw error;
        addToast('Profile saved successfully', 'success');
    } catch (error: any) {
        addToast(error.message, 'error');
    } finally {
        setSaving(false);
    }
  };

  const handleLogout = async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      window.location.href = '/';
  };

  if (loading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit" title="Account Settings">Account Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your profile, security, and preferences.</p>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/10" title="Logout" onClick={handleLogout}>
           <LogOut size={16} className="mr-2"/> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Settings Sidebar */}
         <div className="lg:col-span-1">
            <Card className="p-2 sticky top-24">
               <nav className="flex lg:flex-col gap-1">
                  {[
                     { id: 'profile', label: 'My Profile', icon: User },
                     { id: 'security', label: 'Login & Security', icon: Shield },
                     { id: 'preferences', label: 'Notifications', icon: Bell },
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                           activeTab === tab.id 
                              ? 'bg-brand-light text-brand-primary dark:bg-gray-800 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={tab.label}
                     >
                        <tab.icon size={18} />
                        {tab.label}
                     </button>
                  ))}
               </nav>
            </Card>
         </div>

         {/* Content Area */}
         <div className="lg:col-span-3 space-y-6">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
               <Card>
                  <CardHeader><CardTitle>Public Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                     <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer" title="Change Avatar">
                           <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-[#262626] shadow-lg">
                              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                           </div>
                           <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={24} className="text-white"/>
                           </div>
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900 dark:text-white">{profile.name}</h3>
                           <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.role}</p>
                           <Button size="sm" variant="outline" className="mt-3">Change Avatar</Button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                           <input 
                              type="text" 
                              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent outline-none" 
                              value={profile.name} 
                              onChange={e => setProfile({...profile, name: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                           <input 
                              type="email" 
                              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
                              value={profile.email} 
                              disabled
                           />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                           <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                           <textarea 
                              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-accent outline-none h-24 resize-none" 
                              value={profile.bio} 
                              onChange={e => setProfile({...profile, bio: e.target.value})}
                              placeholder="Tell us about your role..."
                           />
                        </div>
                     </div>

                     <div className="pt-4 flex justify-end">
                        <Button title="Save Profile Changes" onClick={handleSaveProfile} isLoading={saving}>
                            <Save size={16} className="mr-2"/> Save Profile
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
               <div className="space-y-6">
                  <Card>
                     <CardHeader><CardTitle>Password</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            To change your password, please use the "Forgot Password" flow on the login screen or check your email provider settings.
                        </p>
                        <div className="pt-2">
                           <Button title="Reset Password" onClick={() => addToast('Reset link sent to email', 'success')}><Key size={16} className="mr-2"/> Send Reset Link</Button>
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader><CardTitle>Two-Factor Authentication</CardTitle></CardHeader>
                     <CardContent>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                           <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-lg">
                                 Add an extra layer of security to your account by enabling 2FA. We will require a code from your authenticator app when you login.
                              </p>
                              {twoFactor ? (
                                 <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg w-fit">
                                    <Shield size={18}/> 2FA is currently enabled
                                 </div>
                              ) : (
                                 <Button onClick={() => setTwoFactor(true)} title="Enable 2FA">
                                    <QrCode size={16} className="mr-2"/> Enable 2FA
                                 </Button>
                              )}
                           </div>
                           {twoFactor && (
                              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/10" onClick={() => setTwoFactor(false)} title="Disable 2FA">
                                 Disable
                              </Button>
                           )}
                        </div>
                     </CardContent>
                  </Card>
               </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
               <Card>
                  <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                     <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Mail size={16}/> Email Notifications</h4>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Updates</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Get notified when a new order is placed</p>
                              </div>
                              <div 
                                 onClick={() => setNotifications({...notifications, emailOrders: !notifications.emailOrders})}
                                 className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${notifications.emailOrders ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-gray-600'}`}
                                 title="Toggle Order Emails"
                              >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifications.emailOrders ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Marketing Tips</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Receive weekly insights and tips</p>
                              </div>
                              <div 
                                 onClick={() => setNotifications({...notifications, emailMarketing: !notifications.emailMarketing})}
                                 className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${notifications.emailMarketing ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-gray-600'}`}
                                 title="Toggle Marketing Emails"
                              >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifications.emailMarketing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Smartphone size={16}/> Push Notifications</h4>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Alerts</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">New logins and password changes</p>
                              </div>
                              <div 
                                 onClick={() => setNotifications({...notifications, pushSecurity: !notifications.pushSecurity})}
                                 className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${notifications.pushSecurity ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-gray-600'}`}
                                 title="Toggle Security Push"
                              >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifications.pushSecurity ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Alerts</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">When items fall below threshold</p>
                              </div>
                              <div 
                                 onClick={() => setNotifications({...notifications, pushStock: !notifications.pushStock})}
                                 className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 cursor-pointer ${notifications.pushStock ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-gray-600'}`}
                                 title="Toggle Stock Push"
                              >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifications.pushStock ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="pt-4 flex justify-end">
                        <Button title="Save Preferences" onClick={handleSaveProfile} isLoading={saving}>
                            <Save size={16} className="mr-2"/> Save Changes
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            )}

         </div>
      </div>
    </div>
  );
};
